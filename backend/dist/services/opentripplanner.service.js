"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getIsochrone = void 0;
const node_fetch_1 = __importDefault(require("node-fetch"));
const getIsochrone = async (point, time) => {
    const url = `http://localhost:8080/otp/routers/default/isochrone?fromPlace=${point.lat},${point.lng}&mode=TRANSIT,WALK&cutoffSec=${time * 60}`;
    const response = await (0, node_fetch_1.default)(url);
    if (!response.ok) {
        throw new Error("Failed to fetch isochrone");
    }
    return await response.json();
};
exports.getIsochrone = getIsochrone;
//# sourceMappingURL=opentripplanner.service.js.map