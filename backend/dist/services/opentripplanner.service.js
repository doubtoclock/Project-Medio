"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getIsochrone = void 0;
const env_1 = require("../config/env");
const getIsochrone = async (point, time) => {
    const url = new URL(env_1.env.OTP_ISOCHRONE_URL);
    url.searchParams.set("fromPlace", `${point.lat},${point.lng}`);
    url.searchParams.set("mode", "TRANSIT,WALK");
    url.searchParams.set("cutoffSec", String(time * 60));
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error("Failed to fetch isochrone");
    }
    return await response.json();
};
exports.getIsochrone = getIsochrone;
//# sourceMappingURL=opentripplanner.service.js.map