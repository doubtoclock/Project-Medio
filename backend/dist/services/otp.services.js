"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOtpDuration = getOtpDuration;
const env_1 = require("../config/env");
const otpCache = new Map();
async function getOtpDuration(fromLat, fromLon, toLat, toLon, timeoutMs = 2500) {
    const coordinates = [fromLat, fromLon, toLat, toLon];
    if (!coordinates.every(Number.isFinite))
        return null;
    const key = `${fromLat},${fromLon}->${toLat},${toLon}`;
    if (otpCache.has(key)) {
        return otpCache.get(key);
    }
    const query = {
        query: `
      query Plan($fromLat: Float!, $fromLon: Float!, $toLat: Float!, $toLon: Float!) {
        plan(
          from: { lat: $fromLat, lon: $fromLon }
          to: { lat: $toLat, lon: $toLon }
          transportModes: [{ mode: WALK }, { mode: TRANSIT }]
          numItineraries: 1
        ) {
          itineraries {
            duration
          }
        }
      }
    `,
        variables: {
            fromLat,
            fromLon,
            toLat,
            toLon,
        },
    };
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(env_1.env.OTP_GRAPHQL_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(query),
            signal: controller.signal,
        });
        if (!res.ok)
            return null;
        const data = await res.json();
        const duration = data?.data?.plan?.itineraries?.[0]?.duration ?? null;
        if (duration)
            otpCache.set(key, duration);
        return duration;
    }
    catch {
        return null;
    }
    finally {
        clearTimeout(timeout);
    }
}
//# sourceMappingURL=otp.services.js.map