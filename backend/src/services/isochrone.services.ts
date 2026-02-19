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

const MAX_SEARCH_DISTANCE = 10000; // 10 km
const BINARY_ITERATIONS = 6;
const DIRECTIONS = 24; // every 15 degrees

/**
 * Generate isochrone polygon using radial + binary search
 */
export async function generateIsochrone(
  center: Coordinates,
  maxMinutes: number
): Promise<Feature<Polygon | MultiPolygon>> {

  const maxDuration = maxMinutes * 60;
  const boundaryPoints: [number, number][] = [];

  for (let i = 0; i < DIRECTIONS; i++) {
    const angle = (360 / DIRECTIONS) * i;
    const point = await binarySearchDirection(center, angle, maxDuration);
    if (point) boundaryPoints.push(point);
  }

  // Important: polygon must be closed
  if (boundaryPoints.length > 0) {
    boundaryPoints.push(boundaryPoints[0]);
  }

  return turf.polygon([boundaryPoints]) as Feature<Polygon | MultiPolygon>;
}

/**
 * Binary search maximum reachable point in a direction
 */
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

    const duration = await planRoute(center, { lat, lon });

    if (!duration) break;

    if (duration <= maxDuration) {
      low = mid;
      bestPoint = [lon, lat];
    } else {
      high = mid;
    }
  }

  return bestPoint;
}
