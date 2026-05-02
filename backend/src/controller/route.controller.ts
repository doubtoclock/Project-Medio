import { Request, Response } from "express";
import axios from "axios";
import { History } from "../models/history";
import { getOrCreateCurrentUser } from "../utils/current-user";

type TravelMode = "car" | "bike" | "local" | "walk";
type OtpTransportMode = "WALK" | "CAR" | "BICYCLE" | "BUS" | "RAIL" | "SUBWAY";
type LocalTransportMode = "bus" | "rail" | "subway";

const MUMBAI_TIME_ZONE = "Asia/Kolkata";
const METRO_SERVICE_START_HOUR = 6;
const METRO_SERVICE_END_HOUR = 23;

const getMumbaiDateTimeParts = (date: Date) => {
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

  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  );

  return {
    date: `${values.year}-${values.month}-${values.day}`,
    time: `${values.hour}:${values.minute}:${values.second}`,
    hour: Number(values.hour),
  };
};

const getRoutingDateTime = (transportModes: OtpTransportMode[]) => {
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
    const tomorrow = getMumbaiDateTimeParts(
      new Date(now.getTime() + 24 * 60 * 60 * 1000)
    );

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

const getBooleanSetting = (
  settings: Record<string, unknown>,
  keys: string[],
  fallback: boolean
) => {
  for (const key of keys) {
    if (typeof settings[key] === "boolean") {
      return settings[key] as boolean;
    }
  }

  return fallback;
};

const getRequestedTransportModes = (
  travelMode: unknown,
  localTransport: unknown
): OtpTransportMode[] => {
  const requestedMode = typeof travelMode === "string"
    ? travelMode.toLowerCase()
    : "local";
  const mode: TravelMode = (
    requestedMode === "car" ||
    requestedMode === "bike" ||
    requestedMode === "walk" ||
    requestedMode === "local"
  )
    ? requestedMode
    : "local";

  if (mode === "car") return ["CAR"];
  if (mode === "bike") return ["BICYCLE"];
  if (mode === "walk") return ["WALK"];

  const settings = (
    localTransport &&
    typeof localTransport === "object" &&
    !Array.isArray(localTransport)
  )
    ? localTransport as Record<string, unknown>
    : {};

  const localModeMap: Record<LocalTransportMode, {
    otpMode: OtpTransportMode;
    aliases: string[];
  }> = {
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

const filterItinerariesByModes = (
  otpData: any,
  transportModes: OtpTransportMode[]
) => {
  const itineraries = otpData?.data?.plan?.itineraries;
  if (!Array.isArray(itineraries)) return otpData;

  const allowedModes = new Set(transportModes);
  const requiredTransitModes = new Set(
    transportModes.filter((mode) => ["BUS", "RAIL", "SUBWAY"].includes(mode))
  );

  const filteredItineraries = itineraries.filter((itinerary: any) => {
    const legs = Array.isArray(itinerary?.legs) ? itinerary.legs : [];
    const legModes = legs.map((leg: any) => leg?.mode).filter(Boolean);
    const usesOnlyAllowedModes = legModes.every((mode: string) =>
      mode === "WALK" || allowedModes.has(mode as OtpTransportMode)
    );
    const usesRequestedTransit =
      requiredTransitModes.size === 0 ||
      legModes.some((mode: string) =>
        requiredTransitModes.has(mode as OtpTransportMode)
      );

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

export const getRouteFromOTP = async (req: Request, res: Response) => {
  try {
    const { from, to, fromName, toName, travelMode, localTransport } = req.body;

    if (!from?.lat || !from?.lng || !to?.lat || !to?.lng) {
      return res.status(400).json({
        message: "Missing coordinates",
      });
    }

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

    const otpResponse = await axios.post(
      "http://localhost:8080/otp/routers/default/index/graphql",
      graphqlQuery,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const routeData = filterItinerariesByModes(otpResponse.data, transportModes);
    const firstLeg = routeData?.data?.plan?.itineraries?.[0]?.legs?.[0];
    console.log("OTP MODES:", transportModes.join(", "));
    console.log("OTP ROUTING TIME:", routingDateTime.date, routingDateTime.time);
    console.log("RAW OTP LEG:", JSON.stringify(firstLeg, null, 2));

    const user = await getOrCreateCurrentUser(req);
    if (user) {
      const fromLabel = typeof fromName === "string" && fromName.trim()
        ? fromName.trim()
        : `${from.lat}, ${from.lng}`;
      const toLabel = typeof toName === "string" && toName.trim()
        ? toName.trim()
        : `${to.lat}, ${to.lng}`;

      await History.create({
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
  } catch (error: any) {
    console.error(
      "OTP GRAPHQL ERROR:",
      error.response?.data || error.message
    );

    return res.status(500).json({
      message: "Failed to fetch route from OTP",
    });
  }
};
