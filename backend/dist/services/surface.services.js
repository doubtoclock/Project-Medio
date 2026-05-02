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
exports.generateSurfaceIntersection = generateSurfaceIntersection;
const turf = __importStar(require("@turf/turf"));
const otp_services_1 = require("./otp.services");
const GRID_SPACING_KM = 0.75; // 750m grid
const SEARCH_RADIUS_KM = 6; // 6km box
const MAX_GRID_POINTS = 900;
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
async function generateSurfaceIntersection(A, B, meetingMinutes) {
    const pointA = turf.point([A.lon, A.lat]);
    const pointB = turf.point([B.lon, B.lat]);
    const directDistanceKm = turf.distance(pointA, pointB, {
        units: "kilometers"
    });
    const routeCorridor = turf.lineString([
        [A.lon, A.lat],
        [B.lon, B.lat]
    ]);
    const corridorRadiusKm = clamp(Math.max(SEARCH_RADIUS_KM, directDistanceKm * 0.12), SEARCH_RADIUS_KM, 18);
    const bufferedCorridor = turf.buffer(routeCorridor, corridorRadiusKm, {
        units: "kilometers"
    });
    if (!bufferedCorridor) {
        return null;
    }
    const bbox = turf.bbox(bufferedCorridor);
    let gridSpacingKm = clamp(Math.max(GRID_SPACING_KM, directDistanceKm / 35), GRID_SPACING_KM, 5);
    let grid = turf.pointGrid(bbox, gridSpacingKm, { units: "kilometers" });
    while (grid.features.length > MAX_GRID_POINTS) {
        gridSpacingKm *= 1.4;
        grid = turf.pointGrid(bbox, gridSpacingKm, { units: "kilometers" });
    }
    const validPoints = [];
    const promises = grid.features.map(async (point) => {
        const [lon, lat] = point.geometry.coordinates;
        const [timeA, timeB] = await Promise.all([
            (0, otp_services_1.getOtpDuration)(A.lat, A.lon, lat, lon),
            (0, otp_services_1.getOtpDuration)(B.lat, B.lon, lat, lon)
        ]);
        if (!timeA || !timeB)
            return;
        const minutesA = timeA / 60;
        const minutesB = timeB / 60;
        if (minutesA <= meetingMinutes && minutesB <= meetingMinutes) {
            validPoints.push(point);
        }
    });
    await Promise.all(promises);
    if (validPoints.length < 3) {
        return null;
    }
    const fc = turf.featureCollection(validPoints);
    const polygon = turf.concave(fc, {
        maxEdge: 2,
        units: "kilometers"
    });
    return polygon;
}
//# sourceMappingURL=surface.services.js.map