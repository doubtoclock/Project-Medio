import axios from "axios";
import * as turf from "@turf/turf";

type Coordinates = {
  lat: number;
  lon: number;
};

const OTP_URL = "http://localhost:8080/otp/gtfs/v1";

export async function planRoute(
  from: Coordinates,
  to: Coordinates
): Promise<number> {

  const query = `
  {
    plan(
      from: { lat: ${from.lat}, lon: ${from.lon} },
      to: { lat: ${to.lat}, lon: ${to.lon} },
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
      OTP_URL,
      { query: query.replace(/\n/g, "") },
      { timeout: 5000 } // prevent hanging requests
    );

    const duration =
      response.data?.data?.plan?.itineraries?.[0]?.duration;

    if (duration && duration > 0) {
      return duration;
    }

    throw new Error("No route returned by OTP");

  } catch (err) {

    /* ===================================
       DISTANCE FALLBACK
    =================================== */

    const distance = turf.distance(
      turf.point([from.lon, from.lat]),
      turf.point([to.lon, to.lat]),
      { units: "kilometers" }
    );

    let avgSpeed;

    if (distance < 3) avgSpeed = 5;        // walking
    else if (distance < 15) avgSpeed = 12; // mixed transit
    else avgSpeed = 20;                    // metro/train

    const estimatedDuration =
      (distance / avgSpeed) * 3600;

    console.log(
      `⚠️ OTP failed → fallback used. Distance=${distance.toFixed(
        2
      )} km`
    );

    return estimatedDuration;
  }
}