import axios from "axios";

type Coordinates = {
  lat: number;
  lon: number;
};

const OTP_URL = "http://localhost:8080/otp/gtfs/v1";

export async function planRoute(
  from: Coordinates,
  to: Coordinates
): Promise<number | null> {

  const query = `
  {
    plan(
      from: { lat: ${from.lat}, lon: ${from.lon} },
      to: { lat: ${to.lat}, lon: ${to.lon} },
      transportModes: [{ mode: WALK }, { mode: TRANSIT }],
      numItineraries: 1
    ) {
      itineraries {
        duration
      }
    }
  }
  `;

  const response = await axios.post(OTP_URL, {
    query: query.replace(/\n/g, "")
  });

  return response.data?.data?.plan?.itineraries?.[0]?.duration ?? null;
}
