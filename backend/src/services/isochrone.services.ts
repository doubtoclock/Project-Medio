import { planRoute } from "../utils/otp.util";
import * as turf from "@turf/turf";
import { Feature, Polygon, MultiPolygon } from "geojson";

/**
 * Coordinate type shared across services
 */
export type Coordinates = {
  lat: number;
  lon: number;
};

/* =====================================
   CONFIGURATION
===================================== */

const MAX_SEARCH_DISTANCE = 300000; // 300 km (needed for large city distances)
const BINARY_ITERATIONS = 12;       // better precision
const DIRECTIONS = 48;              // every ~7.5 degrees

/* =====================================
   GENERATE ISOCHRONE
===================================== */

export async function generateIsochrone(
  center: Coordinates,
  maxMinutes: number
): Promise<Feature<Polygon | MultiPolygon> | null> {

  const maxDuration = maxMinutes * 60;
  const boundaryPoints: [number, number][] = [];

  for (let i = 0; i < DIRECTIONS; i++) {

    const angle = (360 / DIRECTIONS) * i;

    try {

      const point = await binarySearchDirection(
        center,
        angle,
        maxDuration
      );

      if (point) {
        boundaryPoints.push(point);
      }

    } catch (err) {

      console.log("⚠️ Direction failed:", angle);
    }
  }

  /* =====================================
     POLYGON VALIDATION
  ===================================== */

  if (boundaryPoints.length < 4) {

    console.log(
      "⚠️ Isochrone skipped — insufficient boundary points:",
      boundaryPoints.length
    );

    return null;
  }

  /* =====================================
     CLOSE POLYGON
  ===================================== */

  boundaryPoints.push(boundaryPoints[0]);

  try {

    return turf.polygon([boundaryPoints]) as Feature<
      Polygon | MultiPolygon
    >;

  } catch (err) {

    console.log("❌ Turf polygon generation failed.");

    return null;
  }
}

/* =====================================
   BINARY SEARCH DIRECTION
===================================== */

async function binarySearchDirection(
  center: Coordinates,
  angle: number,
  maxDuration: number
): Promise<[number, number] | null> {

  let low = 0;
  let high = MAX_SEARCH_DISTANCE;

  let bestPoint: [number, number] | null = null;

  for (let i = 0; i < BINARY_ITERATIONS; i++) {

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

    /* =====================================
       HANDLE OTP FAILURES
    ===================================== */

    if (!duration || duration <= 0) {

      // shrink search space instead of killing direction
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