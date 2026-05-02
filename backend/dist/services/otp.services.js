"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOtpDuration = getOtpDuration;
const otpCache = new Map();
async function getOtpDuration(fromLat, fromLon, toLat, toLon, timeoutMs = 2500) {
    const key = `${fromLat},${fromLon}->${toLat},${toLon}`;
    if (otpCache.has(key)) {
        return otpCache.get(key);
    }
    const query = {
        query: `{
      plan(
        from:{lat:${fromLat},lon:${fromLon}}
        to:{lat:${toLat},lon:${toLon}}
        transportModes:[{mode:WALK},{mode:TRANSIT}]
        numItineraries:1
      ){
        itineraries{
          duration
        }
      }
    }`
    };
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch("http://localhost:8080/otp/routers/default/index/graphql", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(query),
            signal: controller.signal
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