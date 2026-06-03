"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRouteFromOTP = void 0;
const axios_1 = __importDefault(require("axios"));
const env_1 = require("../config/env");
const history_1 = require("../models/history");
const current_user_1 = require("../utils/current-user");
const logger_1 = require("../utils/logger");
const MUMBAI_TIME_ZONE = "Asia/Kolkata";
const METRO_SERVICE_START_HOUR = 6;
const METRO_SERVICE_END_HOUR = 23;
const getMumbaiDateTimeParts = (date) => {
    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: MUMBAI_TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23",
    }).formatToParts(date);
    const values = Object.fromEntries(parts
        .filter((part) => part.type !== "literal")
        .map((part) => [part.type, part.value]));
    return {
        date: `${values.year}-${values.month}-${values.day}`,
        time: `${values.hour}:${values.minute}:${values.second}`,
        hour: Number(values.hour),
    };
};
const getRoutingDateTime = (transportModes) => {
    const now = new Date();
    const current = getMumbaiDateTimeParts(now);
    const hasMetro = transportModes.includes("SUBWAY");
    if (!hasMetro) {
        return {
            date: current.date,
            time: current.time,
            adjustedToNextMetroService: false,
        };
    }
    if (current.hour < METRO_SERVICE_START_HOUR) {
        return {
            date: current.date,
            time: "06:00:00",
            adjustedToNextMetroService: true,
        };
    }
    if (current.hour >= METRO_SERVICE_END_HOUR) {
        const tomorrow = getMumbaiDateTimeParts(new Date(now.getTime() + 24 * 60 * 60 * 1000));
        return {
            date: tomorrow.date,
            time: "06:00:00",
            adjustedToNextMetroService: true,
        };
    }
    return {
        date: current.date,
        time: current.time,
        adjustedToNextMetroService: false,
    };
};
const getBooleanSetting = (settings, keys, fallback) => {
    for (const key of keys) {
        if (typeof settings[key] === "boolean") {
            return settings[key];
        }
    }
    return fallback;
};
const getRequestedTransportModes = (travelMode, localTransport) => {
    const requestedMode = typeof travelMode === "string"
        ? travelMode.toLowerCase()
        : "local";
    const mode = (requestedMode === "car" ||
        requestedMode === "bike" ||
        requestedMode === "walk" ||
        requestedMode === "local")
        ? requestedMode
        : "local";
    if (mode === "car")
        return ["CAR"];
    if (mode === "bike")
        return ["BICYCLE"];
    if (mode === "walk")
        return ["WALK"];
    const settings = (localTransport &&
        typeof localTransport === "object" &&
        !Array.isArray(localTransport))
        ? localTransport
        : {};
    const localModeMap = {
        bus: { otpMode: "BUS", aliases: ["bus", "buses"] },
        rail: { otpMode: "RAIL", aliases: ["rail", "locals", "local", "train"] },
        subway: { otpMode: "SUBWAY", aliases: ["subway", "metro"] },
    };
    const selectedTransitModes = Object.entries(localModeMap)
        .filter(([, config]) => getBooleanSetting(settings, config.aliases, true))
        .map(([, config]) => config.otpMode);
    return selectedTransitModes.length > 0
        ? ["WALK", ...selectedTransitModes]
        : [];
};
const filterItinerariesByModes = (otpData, transportModes) => {
    const itineraries = otpData?.data?.plan?.itineraries;
    if (!Array.isArray(itineraries))
        return otpData;
    const allowedModes = new Set(transportModes);
    const requiredTransitModes = new Set(transportModes.filter((mode) => ["BUS", "RAIL", "SUBWAY"].includes(mode)));
    const filteredItineraries = itineraries.filter((itinerary) => {
        const legs = Array.isArray(itinerary?.legs) ? itinerary.legs : [];
        const legModes = legs.map((leg) => leg?.mode).filter(Boolean);
        const usesOnlyAllowedModes = legModes.every((mode) => mode === "WALK" || allowedModes.has(mode));
        const usesRequestedTransit = requiredTransitModes.size === 0 ||
            legModes.some((mode) => requiredTransitModes.has(mode));
        return usesOnlyAllowedModes && usesRequestedTransit;
    });
    return {
        ...otpData,
        data: {
            ...otpData.data,
            plan: {
                ...otpData.data?.plan,
                itineraries: filteredItineraries,
            },
        },
    };
};
const getRouteFromOTP = async (req, res) => {
    try {
        const { from, to, fromName, toName, travelMode, localTransport } = req.body;
        const transportModes = getRequestedTransportModes(travelMode, localTransport);
        if (transportModes.length === 0) {
            return res.status(400).json({
                message: "Select at least one local transport mode",
            });
        }
        const transportModeBlock = transportModes
            .map((mode) => `{ mode: ${mode} }`)
            .join("\n              ");
        const routingDateTime = getRoutingDateTime(transportModes);
        const graphqlQuery = {
            query: `
        query Plan(
          $fromLat: Float!
          $fromLon: Float!
          $toLat: Float!
          $toLon: Float!
          $date: String!
          $time: String!
        ) {
          plan(
            date: $date
            time: $time
            from: { lat: $fromLat, lon: $fromLon }
            to: { lat: $toLat, lon: $toLon }
            transportModes: [
              ${transportModeBlock}
            ]
            numItineraries: 5
          ) {
            itineraries {
              duration
              startTime
              endTime
              legs {
                mode
                distance
                startTime
                endTime
                from {
                  name
                }
                to {
                  name
                }
                route {
                  shortName
                  longName
                }
                legGeometry {
                  points
                }
              }
            }
          }
        }
      `,
            variables: {
                fromLat: from.lat,
                fromLon: from.lng,
                toLat: to.lat,
                toLon: to.lng,
                date: routingDateTime.date,
                time: routingDateTime.time,
            },
        };
        const otpResponse = await axios_1.default.post(env_1.env.OTP_GRAPHQL_URL, graphqlQuery, {
            headers: {
                "Content-Type": "application/json",
            },
            maxRedirects: 5,
            timeout: 8000,
        });
        const routeData = filterItinerariesByModes(otpResponse.data, transportModes);
        logger_1.logger.info("OTP route calculated", {
            requestedModes: transportModes,
            itineraryCount: routeData?.data?.plan?.itineraries?.length ?? 0,
            adjustedToNextMetroService: routingDateTime.adjustedToNextMetroService,
        });
        const user = await (0, current_user_1.getOrCreateCurrentUser)(req);
        if (user) {
            const fromLabel = typeof fromName === "string" && fromName.trim()
                ? fromName.trim()
                : `${from.lat}, ${from.lng}`;
            const toLabel = typeof toName === "string" && toName.trim()
                ? toName.trim()
                : `${to.lat}, ${to.lng}`;
            await history_1.History.create({
                userId: user._id,
                action: "ROUTE_PLANNED",
                value: `${fromLabel} -> ${toLabel}`,
            });
        }
        return res.json({
            ...routeData,
            routing: {
                requestedModes: transportModes,
                date: routingDateTime.date,
                time: routingDateTime.time,
                adjustedToNextMetroService: routingDateTime.adjustedToNextMetroService,
            },
        });
    }
    catch (error) {
        logger_1.logger.error("OTP route request failed", {
            error: error.response?.data || error,
        });
        return res.status(500).json({
            message: "Failed to fetch route from OTP",
        });
    }
};
exports.getRouteFromOTP = getRouteFromOTP;
//# sourceMappingURL=route.controller.js.map