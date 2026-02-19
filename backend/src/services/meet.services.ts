import * as turf from "@turf/turf";
import { Feature, Geometry } from "geojson";
import { generateIsochrone, Coordinates } from "./isochrone.services";
import { fetchMeetingPOIs } from "./poi.services";

/* ==============================
   OTP TRAVEL TIME HELPER
============================== */

async function getOtpDuration(
  fromLat: number,
  fromLon: number,
  toLat: number,
  toLon: number
): Promise<number | null> {

  const query = {
    query: `
      {
        plan(
          from: { lat: ${fromLat}, lon: ${fromLon} }
          to: { lat: ${toLat}, lon: ${toLon} }
          transportModes: [
            { mode: WALK }
            { mode: TRANSIT }
          ]
          numItineraries: 1
        ) {
          itineraries {
            duration
          }
        }
      }
    `
  };

  try {
    const response = await fetch(
      "http://localhost:8080/otp/gtfs/v1",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(query),
      }
    );

    const data = await response.json();
    return data?.data?.plan?.itineraries?.[0]?.duration ?? null;
  } catch (err) {
    console.error("OTP error:", err);
    return null;
  }
}

/* ==============================
   MAIN FIND FUNCTION
============================== */

export async function findMeetPoints(
  A: Coordinates,
  B: Coordinates,
  minutes: number
) {

  console.log("=== GENERATING ISOCHRONES ===");

  const isoA = await generateIsochrone(A, minutes);
  const isoB = await generateIsochrone(B, minutes);

  console.log("IsoA geometry type:", isoA.geometry.type);
  console.log("IsoB geometry type:", isoB.geometry.type);

  const collection = turf.featureCollection([
    isoA as any,
    isoB as any,
  ]);

  let rawIntersection: Feature<Geometry> | null = null;

  try {
    rawIntersection = turf.intersect(collection) as Feature<Geometry> | null;
  } catch (err) {
    console.error("❌ Intersection error:", err);
    return [];
  }

  console.log("Intersection exists:", !!rawIntersection);

  if (!rawIntersection) {
    console.log("❌ No overlapping reachable area.");
    return [];
  }

  console.log("=== FETCHING POIS ===");

  const pois = await fetchMeetingPOIs(rawIntersection);

  console.log("POIs found:", pois.length);

  if (pois.length === 0) return [];

  console.log("=== RANKING POIS ===");

  const enriched = [];

  for (const poi of pois) {

    const timeA = await getOtpDuration(
      A.lat,
      A.lon,
      poi.lat,
      poi.lon
    );

    const timeB = await getOtpDuration(
      B.lat,
      B.lon,
      poi.lat,
      poi.lon
    );

    if (!timeA || !timeB) continue;

    const diff = Math.abs(timeA - timeB);

    enriched.push({
      id: poi.id,
      name: poi.tags?.name || "Unnamed",
      lat: poi.lat,
      lon: poi.lon,
      travelTimeA: Math.round(timeA / 60),
      travelTimeB: Math.round(timeB / 60),
      difference: Math.round(diff / 60),
      average: Math.round((timeA + timeB) / 2 / 60)
    });
  }

  const ranked = enriched
    .sort((a, b) => {
      if (a.difference !== b.difference) {
        return a.difference - b.difference;
      }
      return a.average - b.average;
    })
    .slice(0, 5);

  console.log("Top ranked:", ranked.length);

  return ranked;
}
