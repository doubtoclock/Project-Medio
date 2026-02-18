import { Router, Request, Response } from "express";

const router = Router();

const OTP_BASE = process.env.OTP_URL || "http://localhost:8080";

/* ==============================
   HELPERS
   ============================== */

/** Haversine distance in km */
function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Call OTP 2.8 plan endpoint and return duration in seconds */
interface OtpDurationResponse {
    data?: {
      plan?: {
        itineraries?: {
          duration: number;
        }[];
      };
    };
  }
  
  async function getOtpDuration(
    fromLat: number,
    fromLng: number,
    toLat: number,
    toLng: number
  ): Promise<number | null> {
    try {
      const graphqlQuery = {
        query: `
          {
            plan(
              from: { lat: ${fromLat}, lon: ${fromLng} }
              to: { lat: ${toLat}, lon: ${toLng} }
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
        `,
      };
  
      const response = await fetch(
        "http://localhost:8080/otp/routers/default/index/graphql",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(graphqlQuery),
        }
      );
  
      const data = (await response.json()) as OtpDurationResponse;
  
      return data.data?.plan?.itineraries?.[0]?.duration ?? null;
  
    } catch (err) {
      console.error("OTP duration error:", err);
      return null;
    }
  }
interface Candidate {
  name: string;
  lat: number;
  lng: number;
  type: string;
}

/** Fetch POIs from Overpass API within a radius of a point */
async function fetchCandidatesFromOverpass(
  lat: number,
  lng: number,
  radiusMeters: number
): Promise<Candidate[]> {
  const query = `
    [out:json][timeout:15];
    (
      node["amenity"~"cafe|restaurant|bar|fast_food|pub"](around:${radiusMeters},${lat},${lng});
      node["leisure"~"park|garden"](around:${radiusMeters},${lat},${lng});
      node["shop"~"mall|department_store"](around:${radiusMeters},${lat},${lng});
      node["tourism"~"museum|attraction|viewpoint"](around:${radiusMeters},${lat},${lng});
      node["amenity"~"cinema|theatre|library"](around:${radiusMeters},${lat},${lng});
    );
    out body 200;
  `;

  try {
    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(query)}`,
    });

    if (!res.ok) {
      console.error("Overpass error:", res.status);
      return [];
    }

    const data = await res.json();

    return (data.elements || [])
      .filter((el: any) => el.lat && el.lon && el.tags?.name)
      .map((el: any) => ({
        name: el.tags.name,
        lat: el.lat,
        lng: el.lon,
        type:
          el.tags.amenity ||
          el.tags.leisure ||
          el.tags.shop ||
          el.tags.tourism ||
          "place",
      }));
  } catch (err) {
    console.error("Overpass fetch error:", err);
    return [];
  }
}

/* ==============================
   MAIN ENDPOINT
   ============================== */

router.post("/candidates", async (req: Request, res: Response): Promise<any> => {
  try {
    const { pointA, pointB } = req.body;

    if (!pointA?.lat || !pointA?.lng || !pointB?.lat || !pointB?.lng) {
      return res.status(400).json({ message: "pointA and pointB with lat/lng required" });
    }

    console.log("=== MEET CANDIDATES ===");
    console.log("Point A:", pointA);
    console.log("Point B:", pointB);

    /* ===============================
       1️⃣ GET DIRECT DURATION (A → B)
       =============================== */

    const directDuration = await getOtpDuration(
      pointA.lat,
      pointA.lng,
      pointB.lat,
      pointB.lng
    );

    if (!directDuration) {
      return res.status(400).json({ message: "Could not get direct route between A and B" });
    }

    const buffer = 10 * 60; // 10 minutes in seconds
    const isoTime = directDuration / 2 + buffer;

    console.log("Direct duration (s):", directDuration);
    console.log("Iso time limit (s):", isoTime);

    /* ===============================
       2️⃣ COMPUTE MIDPOINT + RADIUS
       =============================== */

    const midLat = (pointA.lat + pointB.lat) / 2;
    const midLng = (pointA.lng + pointB.lng) / 2;

    const distanceKm = haversineKm(pointA.lat, pointA.lng, pointB.lat, pointB.lng);
    const searchRadiusKm = distanceKm / 2 + 2; // +2km margin
    const searchRadiusMeters = Math.min(searchRadiusKm * 1000, 15000); // cap at 15km

    console.log("Midpoint:", { midLat, midLng });
    console.log("Distance A-B (km):", distanceKm.toFixed(2));
    console.log("Search radius (m):", searchRadiusMeters);

    /* ===============================
       3️⃣ FETCH CANDIDATE PLACES (OVERPASS)
       =============================== */

    const allCandidates = await fetchCandidatesFromOverpass(
      midLat,
      midLng,
      searchRadiusMeters
    );

    console.log("Total candidates from Overpass:", allCandidates.length);

    if (allCandidates.length === 0) {
      return res.status(200).json({
        message: "No candidate places found in the area",
        candidates: [],
      });
    }

    /* ===============================
       4️⃣ PRE-FILTER: TOP 20 BY HAVERSINE FROM MIDPOINT
       =============================== */

    const sorted = allCandidates
      .map((c) => ({
        ...c,
        distFromMid: haversineKm(midLat, midLng, c.lat, c.lng),
      }))
      .sort((a, b) => a.distFromMid - b.distFromMid)
      .slice(0, 20);

    console.log("Pre-filtered to top", sorted.length, "candidates");

    /* ===============================
       5️⃣ VALIDATE WITH OTP (A → C, B → C)
       =============================== */

    const validated = [];

    for (const candidate of sorted) {
      const [timeA, timeB] = await Promise.all([
        getOtpDuration(pointA.lat, pointA.lng, candidate.lat, candidate.lng),
        getOtpDuration(pointB.lat, pointB.lng, candidate.lat, candidate.lng),
      ]);

      if (timeA === null || timeB === null) {
        console.log(`  ❌ ${candidate.name} — OTP failed`);
        continue;
      }

      const timeDiff = Math.abs(timeA - timeB);

      console.log(
        `  🔍 ${candidate.name} — A:${Math.round(timeA / 60)}min B:${Math.round(timeB / 60)}min diff:${Math.round(timeDiff / 60)}min`
      );

      /* ===============================
         6️⃣ FILTER BY FAIRNESS
         =============================== */

      if (timeDiff <= buffer && timeA <= isoTime && timeB <= isoTime) {
        validated.push({
          name: candidate.name,
          lat: candidate.lat,
          lng: candidate.lng,
          type: candidate.type,
          travelTimeA: Math.round(timeA / 60), // minutes
          travelTimeB: Math.round(timeB / 60),
          timeDifference: Math.round(timeDiff / 60),
          averageTime: Math.round((timeA + timeB) / 2 / 60),
        });
      }
    }

    console.log("Validated candidates:", validated.length);

    /* ===============================
       7️⃣ RANK & RETURN TOP 5
       =============================== */

    const ranked = validated
      .sort((a, b) => {
        // Primary: smallest time difference (fairness)
        if (a.timeDifference !== b.timeDifference) {
          return a.timeDifference - b.timeDifference;
        }
        // Secondary: shortest average travel time
        return a.averageTime - b.averageTime;
      })
      .slice(0, 5);

    console.log("=== RETURNING TOP", ranked.length, "RESULTS ===");
    ranked.forEach((r, i) =>
      console.log(
        `  ${i + 1}. ${r.name} (${r.type}) — A:${r.travelTimeA}min B:${r.travelTimeB}min diff:${r.timeDifference}min`
      )
    );

    return res.status(200).json({
      directDuration: Math.round(directDuration / 60),
      isoTimeLimit: Math.round(isoTime / 60),
      searchRadius: Math.round(searchRadiusMeters),
      totalCandidatesFound: allCandidates.length,
      validatedCount: validated.length,
      candidates: ranked,
    });
  } catch (error) {
    console.error("Meet candidates error:", error);
    return res.status(500).json({ message: "Internal server error", error });
  }
});

export default router;