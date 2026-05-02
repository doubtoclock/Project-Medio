"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.planRoute = planRoute;
const axios_1 = __importDefault(require("axios"));
const turf = __importStar(require("@turf/turf"));
const env_1 = require("../config/env");
const logger_1 = require("./logger");
async function planRoute(from, to) {
    const query = `
    query Plan($fromLat: Float!, $fromLon: Float!, $toLat: Float!, $toLon: Float!) {
      plan(
        from: { lat: $fromLat, lon: $fromLon },
        to: { lat: $toLat, lon: $toLon },
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
        const response = await axios_1.default.post(env_1.env.OTP_GRAPHQL_URL, {
            query,
            variables: {
                fromLat: from.lat,
                fromLon: from.lon,
                toLat: to.lat,
                toLon: to.lon,
            },
        }, {
            maxRedirects: 0,
            timeout: 5000,
        });
        const duration = response.data?.data?.plan?.itineraries?.[0]?.duration;
        if (duration && duration > 0) {
            return duration;
        }
        throw new Error("No route returned by OTP");
    }
    catch {
        const distance = turf.distance(turf.point([from.lon, from.lat]), turf.point([to.lon, to.lat]), { units: "kilometers" });
        const avgSpeed = distance < 3 ? 5 : distance < 15 ? 12 : 20;
        const estimatedDuration = (distance / avgSpeed) * 3600;
        logger_1.logger.warn("OTP failed; distance fallback used", {
            distanceKm: Number(distance.toFixed(2)),
        });
        return estimatedDuration;
    }
}
//# sourceMappingURL=otp.util.js.map