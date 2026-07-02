import type { OtpItinerary, OtpLeg } from "../otpTypes";

export type RouteMetrics = {
  etaMinutes: number;
  fare: number;
  walkingMeters: number;
  transfers: number;
  stops: number;
};

export const modeLabels: Record<string, string> = {
  WALK: "Walk",
  CAR: "Car",
  BICYCLE: "Bike",
  BUS: "Bus",
  SUBWAY: "Metro",
  RAIL: "Local Train",
  TRAM: "Tram",
  FERRY: "Ferry",
};

export const modeGlyphs: Record<string, string> = {
  WALK: "Walk",
  CAR: "Car",
  BICYCLE: "Bike",
  BUS: "Bus",
  SUBWAY: "Metro",
  RAIL: "Train",
  TRAM: "Tram",
  FERRY: "Ferry",
};

export const normalizeMode = (mode = "") => mode.toUpperCase();

export const formatDuration = (seconds = 0) => {
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} hr ${rest} min` : `${hours} hr`;
};

export const formatDistance = (meters = 0) => {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(meters < 10000 ? 1 : 0)} km`;
};

export const getLegDurationMinutes = (leg: OtpLeg) => {
  if (Number.isFinite(leg.startTime) && Number.isFinite(leg.endTime)) {
    return Math.max(1, Math.round((leg.endTime - leg.startTime) / 60000));
  }
  return 0;
};

export const getLegRouteName = (leg: OtpLeg) =>
  leg.route?.shortName || leg.route?.longName || modeLabels[normalizeMode(leg.mode)] || leg.mode;

export const getTransportSequence = (itinerary?: OtpItinerary) => {
  const modes = itinerary?.legs?.map((leg) => normalizeMode(leg.mode)) || [];
  return modes.length > 0 ? modes : ["WALK"];
};

export const getRouteMetrics = (itinerary: OtpItinerary): RouteMetrics => {
  const legs = itinerary.legs || [];
  const transitLegs = legs.filter((leg) => !["WALK", "CAR", "BICYCLE"].includes(normalizeMode(leg.mode)));
  const walkingMeters = legs
    .filter((leg) => normalizeMode(leg.mode) === "WALK")
    .reduce((sum, leg) => sum + (leg.distance || 0), 0);
  const stops = transitLegs.reduce((sum, leg) => {
    const distanceStops = Math.max(0, Math.round((leg.distance || 0) / 900) - 1);
    return sum + distanceStops;
  }, 0);

  return {
    etaMinutes: Math.max(1, Math.round((itinerary.duration || 0) / 60)),
    fare: estimateFare(legs),
    walkingMeters,
    transfers: Math.max(0, transitLegs.length - 1),
    stops,
  };
};

export const estimateFare = (legs: OtpLeg[]) => {
  if (legs.some((leg) => normalizeMode(leg.mode) === "CAR")) return 0;
  if (legs.some((leg) => normalizeMode(leg.mode) === "BICYCLE")) return 0;

  return legs.reduce((sum, leg) => {
    const mode = normalizeMode(leg.mode);
    if (mode === "BUS") return sum + 15;
    if (mode === "SUBWAY") return sum + 30;
    if (mode === "RAIL") return sum + 15;
    return sum;
  }, 0);
};

export const getRouteTags = (itineraries: OtpItinerary[], index: number) => {
  const itinerary = itineraries[index];
  if (!itinerary) return [];

  const metrics = getRouteMetrics(itinerary);
  const fastest = Math.min(...itineraries.map((item) => item.duration || Infinity));
  const cheapest = Math.min(...itineraries.map((item) => getRouteMetrics(item).fare));
  const leastWalking = Math.min(...itineraries.map((item) => getRouteMetrics(item).walkingMeters));
  const tags: string[] = [];

  if (itinerary.duration === fastest) tags.push("Fastest");
  if (metrics.fare === cheapest) tags.push(metrics.fare === 0 ? "No fare" : "Cheapest");
  if (metrics.walkingMeters === leastWalking) tags.push("Least walking");

  return tags.slice(0, 3);
};
