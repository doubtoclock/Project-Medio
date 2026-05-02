import { env } from "../config/env";

export const getIsochrone = async (point: { lat: number; lng: number }, time: number) => {
  const url = new URL(env.OTP_ISOCHRONE_URL);
  url.searchParams.set("fromPlace", `${point.lat},${point.lng}`);
  url.searchParams.set("mode", "TRANSIT,WALK");
  url.searchParams.set("cutoffSec", String(time * 60));

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to fetch isochrone");
  }
  return await response.json();
};
