"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRouteFromOTP = void 0;
const env_1 = require("../config/env");
const history_1 = require("../models/history");
const current_user_1 = require("../utils/current-user");
const logger_1 = require("../utils/logger");
const getCurrentDateTimeParts = (date) => {
    const parts = new Intl.DateTimeFormat("en-GB", {
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
    const current = getCurrentDateTimeParts(now);
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
        car: { otpMode: "CAR", aliases: ["car"], defaultEnabled: false },
        bus: { otpMode: "BUS", aliases: ["bus", "buses"], defaultEnabled: true },
        rail: { otpMode: "RAIL", aliases: ["rail", "locals", "local", "train"], defaultEnabled: true },
        subway: { otpMode: "SUBWAY", aliases: ["subway", "metro"], defaultEnabled: true },
    };
    const hasExplicitLocalTransport = Object.keys(settings).length > 0;
    const selectedTransitModes = Object.entries(localModeMap)
        .filter(([, config]) => getBooleanSetting(settings, config.aliases, hasExplicitLocalTransport ? false : config.defaultEnabled))
        .map(([, config]) => config.otpMode);
    if (mode === "car" && selectedTransitModes.length === 0)
        return ["CAR"];
    return selectedTransitModes.length > 0
        ? ["WALK", ...selectedTransitModes]
        : [];
};
const getItinerarySignature = (itinerary) => {
    const legs = Array.isArray(itinerary?.legs) ? itinerary.legs : [];
    return legs
        .filter((leg) => leg?.mode && leg.mode !== "WALK")
        .map((leg) => [
        leg.mode,
        leg.route?.shortName,
        leg.route?.longName,
        leg.from?.name,
        leg.to?.name,
    ].filter(Boolean).join(":"))
        .join("|") || legs
        .map((leg) => `${leg?.mode || "UNKNOWN"}:${Math.round((leg?.distance || 0) / 250)}`)
        .join("|");
};
const pickDistinctBestItineraries = (itineraries, limit = 3) => {
    const seen = new Set();
    const sorted = [...itineraries].sort((a, b) => (a?.duration ?? Infinity) - (b?.duration ?? Infinity));
    return sorted.filter((itinerary) => {
        const signature = getItinerarySignature(itinerary);
        if (seen.has(signature))
            return false;
        seen.add(signature);
        return true;
    }).slice(0, limit);
};
const filterItineraryListByModes = (itineraries, transportModes) => {
    const allowedModes = new Set(transportModes);
    const requestedTransitModes = new Set(transportModes.filter((mode) => ["BUS", "RAIL", "SUBWAY"].includes(mode)));
    return itineraries.filter((itinerary) => {
        const legs = Array.isArray(itinerary?.legs) ? itinerary.legs : [];
        const legModes = legs.map((leg) => leg?.mode).filter(Boolean);
        const usesOnlyAllowedModes = legModes.every((mode) => mode === "WALK" || allowedModes.has(mode));
        const usesRequestedTransit = requestedTransitModes.size === 0 ||
            legModes.some((mode) => requestedTransitModes.has(mode));
        return usesOnlyAllowedModes && usesRequestedTransit;
    });
};
const getCandidateModeSets = (transportModes) => {
    const hasCar = transportModes.includes("CAR");
    const transitModes = transportModes.filter((mode) => ["BUS", "RAIL", "SUBWAY"].includes(mode));
    if (hasCar && transitModes.length > 0) {
        return [
            ["WALK", ...transitModes],
            ["WALK", "CAR"],
        ];
    }
    return [transportModes];
};
const buildOtpQuery = (transportModes, from, to, routingDateTime) => {
    const transportModeBlock = transportModes
        .map((mode) => `{ mode: ${mode} }`)
        .join("\n              ");
    return {
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
          numItineraries: 12
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
                lat
                lon
              }
              to {
                name
                lat
                lon
              }
              route {
                shortName
                longName
              }
              legGeometry {
                points
              }
              intermediateStops {
                name
                lat
                lon
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
};
const fetchOtpPlan = async (modeSet, from, to, routingDateTime) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
        const response = await fetch(env_1.env.OTP_GRAPHQL_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(buildOtpQuery(modeSet, from, to, routingDateTime)),
            signal: controller.signal,
        });
        if (!response.ok) {
            logger_1.logger.error("OTP route request failed", {
                status: response.status,
                statusText: response.statusText,
                url: env_1.env.OTP_GRAPHQL_URL,
                requestedModes: modeSet,
            });
            throw new Error("Failed to fetch route from OTP");
        }
        return response.json();
    }
    finally {
        clearTimeout(timeout);
    }
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
        const routingDateTime = getRoutingDateTime(transportModes);
        const candidateModeSets = getCandidateModeSets(transportModes);
        const otpResponses = await Promise.all(candidateModeSets.map((modeSet) => fetchOtpPlan(modeSet, from, to, routingDateTime)));
        const baseOtpData = otpResponses[0] ?? { data: { plan: { itineraries: [] } } };
        const mergedItineraries = otpResponses.flatMap((otpData, index) => {
            const itineraries = otpData?.data?.plan?.itineraries;
            return Array.isArray(itineraries)
                ? filterItineraryListByModes(itineraries, candidateModeSets[index])
                : [];
        });
        const routeData = {
            ...baseOtpData,
            data: {
                ...baseOtpData.data,
                plan: {
                    ...baseOtpData.data?.plan,
                    itineraries: pickDistinctBestItineraries(mergedItineraries, 3),
                },
            },
        };
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
            error: {
                name: error.name,
                message: error.message,
                cause: error.cause,
                url: env_1.env.OTP_GRAPHQL_URL,
            },
        });
        return res.status(502).json({
            message: "Failed to fetch route from OTP",
        });
    }
};
exports.getRouteFromOTP = getRouteFromOTP;
//# sourceMappingURL=route.controller.js.map