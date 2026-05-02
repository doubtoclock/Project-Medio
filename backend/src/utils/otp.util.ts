import axios from "axios";
import * as turf from "@turf/turf";
import { env } from "../config/env";
import { logger } from "./logger";

type Coordinates = {
  lat: number;
  lon: number;
};

export async function planRoute(
  from: Coordinates,
  to: Coordinates
): Promise<number> {
  const query = `
    query Plan($fromLat: Float!, $fromLon: Float!, $toLat: Float!, $toLon: Float!) {
      plan(
        from: { lat: $fromLat, lon: $fromLon },
        to: { lat: $toLat, lon: $toLon },
        transportModes: [
          { mode: WALK },
          { mode: RAIL },
          { mode: SUBWAY },
          { mode: BUS }
        ],
        numItineraries: 1
      ) {
        itineraries {
          duration
        }
      }
    }
  `;

  try {
    const response = await axios.post(
      env.OTP_GRAPHQL_URL,
      {
        query,
        variables: {
          fromLat: from.lat,
          fromLon: from.lon,
          toLat: to.lat,
          toLon: to.lon,
        },
      },
      {
        maxRedirects: 0,
        timeout: 5000,
      }
    );

    const duration = response.data?.data?.plan?.itineraries?.[0]?.duration;

    if (duration && duration > 0) {
      return duration;
    }

    throw new Error("No route returned by OTP");
  } catch {
    const distance = turf.distance(
      turf.point([from.lon, from.lat]),
      turf.point([to.lon, to.lat]),
      { units: "kilometers" }
    );

    const avgSpeed = distance < 3 ? 5 : distance < 15 ? 12 : 20;
    const estimatedDuration = (distance / avgSpeed) * 3600;

    logger.warn("OTP failed; distance fallback used", {
      distanceKm: Number(distance.toFixed(2)),
    });

    return estimatedDuration;
  }
}
