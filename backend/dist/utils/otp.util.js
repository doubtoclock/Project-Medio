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
const OTP_URL = "http://localhost:8080/otp/gtfs/v1";
async function planRoute(from, to) {
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
        const response = await axios_1.default.post(OTP_URL, { query: query.replace(/\n/g, "") }, { timeout: 5000 } // prevent hanging requests
        );
        const duration = response.data?.data?.plan?.itineraries?.[0]?.duration;
        if (duration && duration > 0) {
            return duration;
        }
        throw new Error("No route returned by OTP");
    }
    catch (err) {
        /* ===================================
           DISTANCE FALLBACK
        =================================== */
        const distance = turf.distance(turf.point([from.lon, from.lat]), turf.point([to.lon, to.lat]), { units: "kilometers" });
        let avgSpeed;
        if (distance < 3)
            avgSpeed = 5; // walking
        else if (distance < 15)
            avgSpeed = 12; // mixed transit
        else
            avgSpeed = 20; // metro/train
        const estimatedDuration = (distance / avgSpeed) * 3600;
        console.log(`⚠️ OTP failed → fallback used. Distance=${distance.toFixed(2)} km`);
        return estimatedDuration;
    }
}
//# sourceMappingURL=otp.util.js.map