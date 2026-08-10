"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasServiceAreaName = exports.isWithinServiceAreaBounds = exports.normalizeServiceAreaText = exports.SERVICE_AREA_NAMES = exports.SERVICE_AREA_QUERY = exports.SERVICE_AREA_BOUNDS = void 0;
exports.SERVICE_AREA_BOUNDS = {
    south: 18.88,
    west: 72.75,
    north: 19.33,
    east: 73.02,
};
exports.SERVICE_AREA_QUERY = "Mumbai Mira Bhayandar";
exports.SERVICE_AREA_NAMES = [
    "mumbai",
    "greater mumbai",
    "mumbai city",
    "mumbai suburban",
    "mira bhayandar",
    "mira-bhayandar",
    "mira bhayander",
    "mira-bhayander",
    "mira road",
    "miraroad",
    "bhayandar",
    "bhayander",
    "kashimira",
];
const normalizeServiceAreaText = (value) => value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
exports.normalizeServiceAreaText = normalizeServiceAreaText;
const isWithinServiceAreaBounds = ({ lat, lng, lon, }) => {
    const longitude = lng ?? lon;
    return (typeof longitude === "number" &&
        Number.isFinite(lat) &&
        Number.isFinite(longitude) &&
        lat >= exports.SERVICE_AREA_BOUNDS.south &&
        lat <= exports.SERVICE_AREA_BOUNDS.north &&
        longitude >= exports.SERVICE_AREA_BOUNDS.west &&
        longitude <= exports.SERVICE_AREA_BOUNDS.east);
};
exports.isWithinServiceAreaBounds = isWithinServiceAreaBounds;
const hasServiceAreaName = (parts) => {
    const haystack = (0, exports.normalizeServiceAreaText)(parts.filter(Boolean).join(" "));
    if (!haystack)
        return false;
    const matchesServiceName = (name) => haystack.includes(name);
    if (matchesServiceName("navi mumbai")) {
        return exports.SERVICE_AREA_NAMES.some((name) => name !== "mumbai" && matchesServiceName(name));
    }
    return exports.SERVICE_AREA_NAMES.some(matchesServiceName);
};
exports.hasServiceAreaName = hasServiceAreaName;
//# sourceMappingURL=service-area.js.map