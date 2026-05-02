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
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateIsochrone = generateIsochrone;
const otp_util_1 = require("../utils/otp.util");
const turf = __importStar(require("@turf/turf"));
/* =====================================
   CONFIGURATION
===================================== */
const MAX_SEARCH_DISTANCE = 300000; // 300 km (needed for large city distances)
const BINARY_ITERATIONS = 12; // better precision
const DIRECTIONS = 48; // every ~7.5 degrees
/* =====================================
   GENERATE ISOCHRONE
===================================== */
async function generateIsochrone(center, maxMinutes) {
    const maxDuration = maxMinutes * 60;
    const boundaryPoints = [];
    for (let i = 0; i < DIRECTIONS; i++) {
        const angle = (360 / DIRECTIONS) * i;
        try {
            const point = await binarySearchDirection(center, angle, maxDuration);
            if (point) {
                boundaryPoints.push(point);
            }
        }
        catch (err) {
            console.log("⚠️ Direction failed:", angle);
        }
    }
    /* =====================================
       POLYGON VALIDATION
    ===================================== */
    if (boundaryPoints.length < 4) {
        console.log("⚠️ Isochrone skipped — insufficient boundary points:", boundaryPoints.length);
        return null;
    }
    /* =====================================
       CLOSE POLYGON
    ===================================== */
    boundaryPoints.push(boundaryPoints[0]);
    try {
        return turf.polygon([boundaryPoints]);
    }
    catch (err) {
        console.log("❌ Turf polygon generation failed.");
        return null;
    }
}
/* =====================================
   BINARY SEARCH DIRECTION
===================================== */
async function binarySearchDirection(center, angle, maxDuration) {
    let low = 0;
    let high = MAX_SEARCH_DISTANCE;
    let bestPoint = null;
    for (let i = 0; i < BINARY_ITERATIONS; i++) {
        const mid = (low + high) / 2;
        const destination = turf.destination(turf.point([center.lon, center.lat]), mid / 1000, angle, { units: "kilometers" });
        const [lon, lat] = destination.geometry.coordinates;
        let duration = null;
        try {
            duration = await (0, otp_util_1.planRoute)(center, { lat, lon });
        }
        catch {
            duration = null;
        }
        /* =====================================
           HANDLE OTP FAILURES
        ===================================== */
        if (!duration || duration <= 0) {
            // shrink search space instead of killing direction
            high = mid;
            continue;
        }
        if (duration <= maxDuration) {
            low = mid;
            bestPoint = [lon, lat];
        }
        else {
            high = mid;
        }
    }
    return bestPoint;
}
//# sourceMappingURL=isochrone.services.js.map