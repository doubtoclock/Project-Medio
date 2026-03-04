import * as turf from "@turf/turf";
import { Coordinates } from "./isochrone.services";
import { getOtpDuration } from "./otp.services";

const GRID_SPACING_KM = 0.75;   // 750m grid
const SEARCH_RADIUS_KM = 6;     // 6km box

export async function generateSurfaceIntersection(
  A: Coordinates,
  B: Coordinates,
  meetingMinutes: number
) {

  const midpoint = turf.midpoint(
    turf.point([A.lon, A.lat]),
    turf.point([B.lon, B.lat])
  );

  const bbox = turf.bbox(
    turf.buffer(midpoint, SEARCH_RADIUS_KM, { units: "kilometers" })
  );

  const grid = turf.pointGrid(bbox, GRID_SPACING_KM, { units: "kilometers" });

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

  const fc = turf.featureCollection(validPoints);

  const polygon = turf.concave(fc, {
    maxEdge: 2,
    units: "kilometers"
  });

  return polygon;
}