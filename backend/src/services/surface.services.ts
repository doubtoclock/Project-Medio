import * as turf from "@turf/turf";
import { Coordinates } from "./isochrone.services";
import { getOtpDuration } from "./otp.services";

const GRID_SPACING_KM = 0.75;   // 750m grid
const SEARCH_RADIUS_KM = 6;     // 6km box
const MAX_GRID_POINTS = 900;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export async function generateSurfaceIntersection(
  A: Coordinates,
  B: Coordinates,
  meetingMinutes: number
) {

  const pointA = turf.point([A.lon, A.lat]);
  const pointB = turf.point([B.lon, B.lat]);
  const directDistanceKm = turf.distance(pointA, pointB, {
    units: "kilometers"
  });

  const routeCorridor = turf.lineString(
    [
      [A.lon, A.lat],
      [B.lon, B.lat]
    ]
  );

  const corridorRadiusKm = clamp(
    Math.max(SEARCH_RADIUS_KM, directDistanceKm * 0.12),
    SEARCH_RADIUS_KM,
    18
  );

  const bufferedCorridor = turf.buffer(routeCorridor, corridorRadiusKm, {
    units: "kilometers"
  });

  if (!bufferedCorridor) {
    return null;
  }

  const bbox = turf.bbox(bufferedCorridor);

  let gridSpacingKm = clamp(
    Math.max(GRID_SPACING_KM, directDistanceKm / 35),
    GRID_SPACING_KM,
    5
  );

  let grid = turf.pointGrid(bbox, gridSpacingKm, { units: "kilometers" });

  while (grid.features.length > MAX_GRID_POINTS) {
    gridSpacingKm *= 1.4;
    grid = turf.pointGrid(bbox, gridSpacingKm, { units: "kilometers" });
  }

  const validPoints: any[] = [];

  const promises = grid.features.map(async (point: any) => {

    const [lon, lat] = point.geometry.coordinates;

    const [timeA, timeB] = await Promise.all([
      getOtpDuration(A.lat, A.lon, lat, lon),
      getOtpDuration(B.lat, B.lon, lat, lon)
    ]);

    if (!timeA || !timeB) return;

    const minutesA = timeA / 60;
    const minutesB = timeB / 60;

    if (minutesA <= meetingMinutes && minutesB <= meetingMinutes) {
      validPoints.push(point);
    }
  });

  await Promise.all(promises);

  if (validPoints.length < 3) {
    return null;
  }

  const fc = turf.featureCollection(validPoints) as any;

  const polygon = turf.concave(fc, {
    maxEdge: 2,
    units: "kilometers"
  });

  return polygon;
}
