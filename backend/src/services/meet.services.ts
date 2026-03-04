import * as turf from "@turf/turf";
import { Coordinates } from "./isochrone.services";
import { fetchMeetingPOIs } from "./poi.services";
import { generateSurfaceIntersection } from "./surface.services";
import { getOtpDuration } from "./otp.services";

/* ==============================
   MAIN FIND FUNCTION
============================== */

export async function findMeetPoints(
  A: Coordinates,
  B: Coordinates
) {

  console.log("=== CALCULATING A→B TRAVEL TIME ===");

  let totalDuration = await getOtpDuration(
    A.lat,
    A.lon,
    B.lat,
    B.lon
  );

  /* =====================================
     FALLBACK IF OTP FAILS
  ===================================== */

  if (!totalDuration || totalDuration <= 0) {

    console.log("⚠️ OTP could not calculate A→B duration. Using fallback.");

    const distance = turf.distance(
      turf.point([A.lon, A.lat]),
      turf.point([B.lon, B.lat]),
      { units: "kilometers" }
    );

    let avgSpeed;

    if (distance < 3) {
      avgSpeed = 5; // walking
    } 
    else if (distance < 15) {
      avgSpeed = 12; // short transit
    } 
    else {
      avgSpeed = 18; // long transit
    }

    totalDuration = (distance / avgSpeed) * 3600;

    console.log(
      `Fallback distance=${distance.toFixed(2)}km speed=${avgSpeed}km/h`
    );
  }

  console.log("Total A→B duration (seconds):", totalDuration);

  /* =====================================
     INITIAL MEETING TIME
  ===================================== */

  let meetingMinutes = Math.ceil(totalDuration / 2 / 60);

  const MAX_REASONABLE = 180;

  if (meetingMinutes > MAX_REASONABLE) {

    console.log(
      `Travel time too large (${meetingMinutes} mins). Limiting to ${MAX_REASONABLE}`
    );

    meetingMinutes = MAX_REASONABLE;
  }

  const MAX_LIMIT = 360;
  const STEP = 15;

  let polygon: any = null;

  console.log("Initial meeting time:", meetingMinutes, "minutes");

  /* =====================================
     AUTO-EXPANDING SURFACE SEARCH
  ===================================== */

  while (meetingMinutes <= MAX_LIMIT) {

    console.log("Trying with", meetingMinutes, "minutes");

    try {

      polygon = await generateSurfaceIntersection(
        A,
        B,
        meetingMinutes
      );

      if (polygon) {

        console.log("✅ Surface intersection found");

        break;
      }

    } catch (err) {

      console.log("⚠️ Surface generation failed:", err);
    }

    meetingMinutes += STEP;
  }

  if (!polygon) {

    console.log("❌ No intersection even after expansion.");

    return [];
  }

  /* =====================================
     FETCH POIs INSIDE INTERSECTION
  ===================================== */

  console.log("=== FETCHING POIS ===");

  let pois = await fetchMeetingPOIs(polygon);

  /* =====================================
     EXPAND AREA IF NO POIs
  ===================================== */

  if (!pois || pois.length === 0) {

    console.log("⚠️ No POIs found. Expanding search area by 2km.");

    try {

      const expandedPolygon = turf.buffer(
        polygon,
        2,
        { units: "kilometers" }
      );

      pois = await fetchMeetingPOIs(expandedPolygon as any);

    } catch {

      console.log("⚠️ Polygon buffer failed.");
    }

    if (!pois || pois.length === 0) {

      console.log("❌ Still no POIs after expansion.");

      return [];
    }

    console.log("POIs found after expansion:", pois.length);
  }

  console.log("POIs found:", pois.length);

  /* =====================================
     MIDPOINT CALCULATION
  ===================================== */

  const midpoint = turf.midpoint(
    turf.point([A.lon, A.lat]),
    turf.point([B.lon, B.lat])
  );

  /* =====================================
     SMART POI PRE-FILTER
  ===================================== */

  const candidatePois = pois
    .map(poi => {

      const distMid = turf.distance(
        midpoint,
        turf.point([poi.lon, poi.lat]),
        { units: "kilometers" }
      );

      const distA = turf.distance(
        turf.point([A.lon, A.lat]),
        turf.point([poi.lon, poi.lat]),
        { units: "kilometers" }
      );

      const distB = turf.distance(
        turf.point([B.lon, B.lat]),
        turf.point([poi.lon, poi.lat]),
        { units: "kilometers" }
      );

      return {
        ...poi,
        distMid,
        balance: Math.abs(distA - distB)
      };

    })
    .sort((a, b) => {

      if (a.balance !== b.balance) {
        return a.balance - b.balance;
      }

      return a.distMid - b.distMid;
    })
    .slice(0, 15);

  console.log("Candidate POIs after smart filter:", candidatePois.length);

  /* =====================================
     PARALLEL OTP RANKING
  ===================================== */

  const enriched = await Promise.all(

    candidatePois.map(async (poi) => {

      let timeA = await getOtpDuration(A.lat, A.lon, poi.lat, poi.lon);
      let timeB = await getOtpDuration(B.lat, B.lon, poi.lat, poi.lon);

      /* fallback if OTP fails */

      if (!timeA || !timeB) {

        const distA = turf.distance(
          turf.point([A.lon, A.lat]),
          turf.point([poi.lon, poi.lat]),
          { units: "kilometers" }
        );

        const distB = turf.distance(
          turf.point([B.lon, B.lat]),
          turf.point([poi.lon, poi.lat]),
          { units: "kilometers" }
        );

        const avgSpeed = 15;

        timeA = (distA / avgSpeed) * 3600;
        timeB = (distB / avgSpeed) * 3600;
      }

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

    console.log("❌ No valid ranked POIs.");

    return [];
  }

  /* =====================================
     FINAL RANKING
  ===================================== */

  const ranked = valid
    .sort((a: any, b: any) => {

      if (a.difference !== b.difference) {
        return a.difference - b.difference;
      }

      return a.average - b.average;
    })
    .slice(0, 5);

  console.log("🏆 Final Top 5 Ready");

  return ranked;
}