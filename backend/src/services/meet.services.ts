import * as turf from "@turf/turf";
import { Feature, Geometry } from "geojson";
import { generateIsochrone, Coordinates } from "./isochrone.services";
import { fetchMeetingPOIs } from "./poi.services";

/* =====================================
   🔥 SIMPLE IN-MEMORY OTP CACHE
===================================== */

const otpCache = new Map<string, number>();

/* ==============================
   OTP TRAVEL TIME HELPER
============================== */

async function getOtpDuration(
  fromLat: number,
  fromLon: number,
  toLat: number,
  toLon: number
): Promise<number | null> {

  const cacheKey = `${fromLat},${fromLon}->${toLat},${toLon}`;

  // ✅ Return cached result if available
  if (otpCache.has(cacheKey)) {
    return otpCache.get(cacheKey)!;
  }

  const today = new Date();
  const date = today.toISOString().split("T")[0];
  const time = today.toTimeString().slice(0, 5);

  const query = {
    query: `{ 
      plan(
        from: { lat: ${fromLat}, lon: ${fromLon} }
        to: { lat: ${toLat}, lon: ${toLon} }
        transportModes: [{ mode: WALK }, { mode: TRANSIT }]
        date: "${date}"
        time: "${time}"
        numItineraries: 1
      ) {
        itineraries {
          duration
        }
      }
    }`
  };

  try {
    const response = await fetch(
      "http://localhost:8080/otp/routers/default/index/graphql",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(query),
      }
    );

    const data: any = await response.json();
    const duration = data?.data?.plan?.itineraries?.[0]?.duration ?? null;

    if (duration != null) {
      otpCache.set(cacheKey, duration);
    }

    return duration;

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

  if (!isoA || !isoB) {
    console.log("❌ Isochrone generation failed.");
    return [];
  }

  let rawIntersection: Feature<Geometry> | null = null;

  try {
    const collection = turf.featureCollection([
      isoA as any,
      isoB as any,
    ]);

    rawIntersection = turf.intersect(collection) as Feature<Geometry> | null;

  } catch (err) {
    console.error("❌ Intersection error:", err);
    return [];
  }

  if (!rawIntersection) {
    console.log("❌ No overlapping reachable area.");
    return [];
  }

  console.log("=== FETCHING POIS ===");

  const pois = await fetchMeetingPOIs(rawIntersection);

  if (!pois || pois.length === 0) {
    console.log("❌ No POIs found inside intersection.");
    return [];
  }

  console.log("POIs found:", pois.length);

  /* ==================================
     🔥 OPTIMIZATION 1: MIDPOINT FILTER
  ================================== */

  const midpoint = turf.midpoint(
    turf.point([A.lon, A.lat]),
    turf.point([B.lon, B.lat])
  );

  const filteredPois = pois
    .map(poi => {
      const dist = turf.distance(
        midpoint,
        turf.point([poi.lon, poi.lat]),
        { units: "kilometers" }
      );
      return { ...poi, dist };
    })
    .sort((a, b) => a.dist - b.dist)
    .slice(0, 12); // Reduced further for speed

  console.log("Filtered POIs (for OTP check):", filteredPois.length);

  /* ==================================
     ⚡ OPTIMIZATION 2: FULL PARALLEL RANKING
  ================================== */

  const enriched = await Promise.all(
    filteredPois.map(async (poi) => {

      const [timeA, timeB] = await Promise.all([
        getOtpDuration(A.lat, A.lon, poi.lat, poi.lon),
        getOtpDuration(B.lat, B.lon, poi.lat, poi.lon),
      ]);

      if (timeA == null || timeB == null) return null;

      const diff = Math.abs(timeA - timeB);

      return {
        id: poi.id,
        name: poi.tags?.name || "Unnamed",
        lat: poi.lat,
        lon: poi.lon,
        travelTimeA: Math.round(timeA / 60),
        travelTimeB: Math.round(timeB / 60),
        difference: Math.round(diff / 60),
        average: Math.round((timeA + timeB) / 2 / 60)
      };
    })
  );

  const valid = enriched.filter(Boolean);

  if (valid.length === 0) {
    console.log("❌ No valid ranked POIs after OTP filtering.");
    return [];
  }

  const ranked = valid
    .sort((a: any, b: any) => {
      if (a.difference !== b.difference) {
        return a.difference - b.difference;
      }
      return a.average - b.average;
    })
    .slice(0, 5);

  console.log("Top ranked:", ranked.length);

  return ranked;
}