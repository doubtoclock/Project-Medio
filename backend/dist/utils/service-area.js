"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasServiceAreaName = exports.isWithinServiceAreaBounds = exports.normalizeServiceAreaText = exports.SERVICE_AREA_NAMES = exports.SERVICE_AREA_QUERY = exports.SERVICE_AREA_BOUNDS = exports.DEFAULT_SERVICE_AREA = exports.SERVICE_AREAS = void 0;
exports.SERVICE_AREAS = [
    {
        id: "mumbai-mira-bhayandar",
        label: "Mumbai and Mira Bhayandar",
        photonQuery: "Mumbai Mira Bhayandar",
        bounds: {
            south: 18.88,
            west: 72.75,
            north: 19.33,
            east: 73.02,
        },
        acceptedNames: [
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
        ],
    },
];
exports.DEFAULT_SERVICE_AREA = exports.SERVICE_AREAS[0];
exports.SERVICE_AREA_BOUNDS = exports.DEFAULT_SERVICE_AREA.bounds;
exports.SERVICE_AREA_QUERY = exports.DEFAULT_SERVICE_AREA.photonQuery;
exports.SERVICE_AREA_NAMES = exports.DEFAULT_SERVICE_AREA.acceptedNames;
const normalizeServiceAreaText = (value) => value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
exports.normalizeServiceAreaText = normalizeServiceAreaText;
const isWithinServiceAreaBounds = ({ lat, lng, lon, serviceArea = exports.DEFAULT_SERVICE_AREA, }) => {
    const longitude = lng ?? lon;
    return (typeof longitude === "number" &&
        Number.isFinite(lat) &&
        Number.isFinite(longitude) &&
        lat >= serviceArea.bounds.south &&
        lat <= serviceArea.bounds.north &&
        longitude >= serviceArea.bounds.west &&
        longitude <= serviceArea.bounds.east);
};
exports.isWithinServiceAreaBounds = isWithinServiceAreaBounds;
const hasServiceAreaName = (parts, serviceArea = exports.DEFAULT_SERVICE_AREA) => {
    const haystack = (0, exports.normalizeServiceAreaText)(parts.filter(Boolean).join(" "));
    if (!haystack)
        return false;
    const matchesServiceName = (name) => haystack.includes(name);
    if (matchesServiceName("navi mumbai")) {
        return serviceArea.acceptedNames.some((name) => name !== "mumbai" && matchesServiceName(name));
    }
    return serviceArea.acceptedNames.some(matchesServiceName);
};
exports.hasServiceAreaName = hasServiceAreaName;
//# sourceMappingURL=service-area.js.map