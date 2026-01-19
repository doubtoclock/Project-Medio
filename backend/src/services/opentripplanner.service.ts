import fetch from "node-fetch";

export const getIsochrone = async (point: { lat: number; lng: number }, time: number) => {
  const url = `http://localhost:8080/otp/routers/default/isochrone?fromPlace=${point.lat},${point.lng}&mode=TRANSIT,WALK&cutoffSec=${time * 60}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to fetch isochrone");
  }
  return await response.json();
};
