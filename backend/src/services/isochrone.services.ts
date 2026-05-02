import * as turf from "@turf/turf";
import { Feature, MultiPolygon, Polygon } from "geojson";
import { logger } from "../utils/logger";
import { planRoute } from "../utils/otp.util";

export type Coordinates = {
  lat: number;
  lon: number;
};

const MAX_SEARCH_DISTANCE = 300000;
const BINARY_ITERATIONS = 12;
const DIRECTIONS = 48;

export async function generateIsochrone(
  center: Coordinates,
  maxMinutes: number
): Promise<Feature<Polygon | MultiPolygon> | null> {
  const maxDuration = maxMinutes * 60;
  const boundaryPoints: [number, number][] = [];

  for (let index = 0; index < DIRECTIONS; index += 1) {
    const angle = (360 / DIRECTIONS) * index;

    try {
      const point = await binarySearchDirection(center, angle, maxDuration);

      if (point) {
        boundaryPoints.push(point);
      }
    } catch {
      logger.debug("Isochrone direction failed", { angle });
    }
  }

  if (boundaryPoints.length < 4) {
    logger.debug("Isochrone skipped; insufficient boundary points", {
      boundaryPointCount: boundaryPoints.length,
    });

    return null;
  }

  boundaryPoints.push(boundaryPoints[0]);

  try {
    return turf.polygon([boundaryPoints]) as Feature<Polygon | MultiPolygon>;
  } catch {
    logger.warn("Turf polygon generation failed");
    return null;
  }
}

async function binarySearchDirection(
  center: Coordinates,
  angle: number,
  maxDuration: number
): Promise<[number, number] | null> {
  let low = 0;
  let high = MAX_SEARCH_DISTANCE;
  let bestPoint: [number, number] | null = null;

  for (let index = 0; index < BINARY_ITERATIONS; index += 1) {
    const mid = (low + high) / 2;
    const destination = turf.destination(
      turf.point([center.lon, center.lat]),
      mid / 1000,
      angle,
      { units: "kilometers" }
    );
    const [lon, lat] = destination.geometry.coordinates;
    let duration: number | null = null;

    try {
      duration = await planRoute(center, { lat, lon });
    } catch {
      duration = null;
    }

    if (!duration || duration <= 0) {
      high = mid;
      continue;
    }

    if (duration <= maxDuration) {
      low = mid;
      bestPoint = [lon, lat];
    } else {
      high = mid;
    }
  }

  return bestPoint;
}
