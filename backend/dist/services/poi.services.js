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
exports.POILookupUnavailableError = void 0;
exports.fetchMeetingPOIsNearPoints = fetchMeetingPOIsNearPoints;
exports.fetchPhotonMeetingPOIsNearPoints = fetchPhotonMeetingPOIsNearPoints;
exports.fetchMeetingPOIs = fetchMeetingPOIs;
const axios_1 = __importDefault(require("axios"));
const turf = __importStar(require("@turf/turf"));
class POILookupUnavailableError extends Error {
    constructor(failures) {
        super(`Live POI lookup unavailable: ${failures.join("; ")}`);
        this.name = "POILookupUnavailableError";
    }
}
exports.POILookupUnavailableError = POILookupUnavailableError;
const OVERPASS_ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.openstreetmap.ru/api/interpreter"
];
const PHOTON_ENDPOINT = "https://photon.komoot.io/api";
const PHOTON_MEETING_QUERIES = [
    "cafe",
    "coffee",
    "food",
    "restaurant",
    "mall",
    "park"
];
const GENERIC_PHOTON_NAMES = new Set([
    "cafe",
    "coffee",
    "food",
    "mall",
    "park",
    "restaurant"
]);
const PHOTON_ALLOWED_VALUES = {
    amenity: new Set([
        "bar",
        "cafe",
        "cinema",
        "community_centre",
        "fast_food",
        "food_court",
        "ice_cream",
        "library",
        "marketplace",
        "pub",
        "restaurant",
        "theatre"
    ]),
    leisure: new Set([
        "bowling_alley",
        "fitness_centre",
        "garden",
        "park",
        "sports_centre"
    ]),
    natural: new Set(["beach"]),
    shop: new Set(["books", "department_store", "mall"]),
    tourism: new Set(["attraction", "gallery", "hotel", "museum"])
};
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const toPoint = (point) => turf.point([point.lon, point.lat]);
const getDistanceKm = (from, to) => turf.distance(toPoint(from), toPoint(to), { units: "kilometers" });
const dedupePOIs = (pois) => {
    const seen = new Set();
    return pois.filter((poi) => {
        const key = `${poi.type || "node"}:${poi.id}`;
        if (seen.has(key))
            return false;
        seen.add(key);
        return true;
    });
};
const normalizeOverpassElement = (element) => {
    const lat = element.lat ?? element.center?.lat;
    const lon = element.lon ?? element.center?.lon;
    if (typeof lat !== "number" ||
        typeof lon !== "number" ||
        Number.isNaN(lat) ||
        Number.isNaN(lon)) {
        return null;
    }
    return {
        type: element.type,
        id: element.id,
        lat,
        lon,
        tags: element.tags
    };
};
const normalizeOverpassElements = (elements) => elements
    .map(normalizeOverpassElement)
    .filter((poi) => Boolean(poi));
const normalizePhotonFeature = (feature) => {
    const properties = feature.properties;
    const coordinates = feature.geometry?.coordinates;
    const lon = coordinates?.[0];
    const lat = coordinates?.[1];
    const name = properties?.name?.trim();
    const osmId = properties?.osm_id;
    const osmKey = properties?.osm_key;
    const osmValue = properties?.osm_value;
    const allowedValues = osmKey ? PHOTON_ALLOWED_VALUES[osmKey] : undefined;
    if (typeof lat !== "number" ||
        typeof lon !== "number" ||
        typeof osmId !== "number" ||
        !osmKey ||
        !osmValue ||
        !allowedValues?.has(osmValue) ||
        !name ||
        GENERIC_PHOTON_NAMES.has(name.toLowerCase()) ||
        !Number.isFinite(lat) ||
        !Number.isFinite(lon)) {
        return null;
    }
    const osmType = properties?.osm_type === "W"
        ? "way"
        : properties?.osm_type === "R"
            ? "relation"
            : "node";
    const tags = { name };
    tags[osmKey] = osmValue;
    return {
        type: osmType,
        id: osmId,
        lat,
        lon,
        tags
    };
};
const fetchPhotonQuery = async (query, point, timeoutMs) => {
    const response = await axios_1.default.get(PHOTON_ENDPOINT, {
        params: {
            q: query,
            limit: 12,
            lat: point.lat,
            lon: point.lon
        },
        headers: {
            "User-Agent": "Medio/1.0 (meeting-place-search)"
        },
        timeout: timeoutMs
    });
    const features = response.data?.features;
    if (!Array.isArray(features)) {
        return [];
    }
    return features
        .map(normalizePhotonFeature)
        .filter((poi) => Boolean(poi));
};
const postOverpassQuery = async (endpoint, query, timeoutMs) => {
    const response = await axios_1.default.post(endpoint, new URLSearchParams({
        data: query
    }).toString(), {
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "Medio/1.0 (meeting-place-search)"
        },
        timeout: timeoutMs
    });
    if (!response.data || !response.data.elements) {
        return [];
    }
    return normalizeOverpassElements(response.data.elements);
};
const fetchFirstOverpassResponse = async (query, timeoutMs) => {
    const failures = [];
    for (const endpoint of OVERPASS_ENDPOINTS) {
        try {
            const pois = await postOverpassQuery(endpoint, query, timeoutMs);
            return { pois, failures };
        }
        catch (err) {
            const status = err?.response?.status;
            const message = status ? `status ${status}` : err.message;
            failures.push(`${endpoint} (${message})`);
        }
    }
    return { pois: [], failures };
};
const buildAroundQuery = (points, radiusKm, limit) => {
    const radiusMeters = Math.round(clamp(radiusKm, 0.5, 50) * 1000);
    const venueFilters = [
        `["amenity"~"cafe|restaurant|food_court|fast_food|ice_cream|bar|pub|library|cinema|theatre|arts_centre|community_centre|marketplace"]["name"]`,
        `["leisure"~"park|garden|bowling_alley|sports_centre|fitness_centre"]["name"]`,
        `["tourism"~"museum|attraction|gallery|hotel"]["name"]`,
        `["shop"~"mall|department_store|books"]["name"]`,
        `["natural"="beach"]["name"]`
    ];
    const pointLimit = radiusKm > 12 ? 3 : radiusKm > 6 ? 5 : 7;
    const blocks = points
        .slice(0, pointLimit)
        .flatMap((point) => venueFilters.flatMap((filter) => [
        `node(around:${radiusMeters},${point.lat},${point.lon})${filter};`,
        `way(around:${radiusMeters},${point.lat},${point.lon})${filter};`
    ]))
        .join("\n");
    return `
  [out:json][timeout:10];
  (
    ${blocks}
  );
  out center ${limit};
  `;
};
async function fetchMeetingPOIsNearPoints(points, radiusKm, limit = 80, timeoutMs = 4500) {
    if (points.length === 0)
        return [];
    const query = buildAroundQuery(points, radiusKm, limit);
    const { pois: responsePois, failures } = await fetchFirstOverpassResponse(query, timeoutMs);
    const pois = dedupePOIs(responsePois)
        .filter((poi) => Number.isFinite(poi.lat) && Number.isFinite(poi.lon))
        .slice(0, limit);
    console.log("Fast Overpass POIs:", pois.length);
    if (pois.length === 0 && failures.length > 0) {
        console.log("Live POI lookup unavailable at this radius.");
    }
    if (pois.length === 0 && failures.length === OVERPASS_ENDPOINTS.length) {
        throw new POILookupUnavailableError(failures);
    }
    return pois;
}
async function fetchPhotonMeetingPOIsNearPoints(points, radiusKm, limit = 80, timeoutMs = 3500) {
    if (points.length === 0)
        return [];
    const searchPoints = points.slice(0, 3);
    const maxDistanceKm = clamp(radiusKm, 2, 35);
    const requests = searchPoints.flatMap((point) => PHOTON_MEETING_QUERIES.map((query) => fetchPhotonQuery(query, point, timeoutMs)));
    const settled = await Promise.allSettled(requests);
    const pois = settled
        .flatMap((result) => (result.status === "fulfilled" ? result.value : []))
        .filter((poi) => searchPoints.some((point) => getDistanceKm(point, { lat: poi.lat, lon: poi.lon }) <= maxDistanceKm));
    const deduped = dedupePOIs(pois);
    return deduped
        .sort((left, right) => {
        const nearestLeft = Math.min(...searchPoints.map((point) => getDistanceKm(point, { lat: left.lat, lon: left.lon })));
        const nearestRight = Math.min(...searchPoints.map((point) => getDistanceKm(point, { lat: right.lat, lon: right.lon })));
        return nearestLeft - nearestRight;
    })
        .slice(0, limit);
}
async function fetchMeetingPOIs(polygon) {
    const bbox = turf.bbox(polygon);
    const south = bbox[1];
    const west = bbox[0];
    const north = bbox[3];
    const east = bbox[2];
    const query = `
  [out:json][timeout:25];

  (
    node["amenity"~"cafe|restaurant|fast_food|food_court|ice_cream"]["name"](${south},${west},${north},${east});
    way["amenity"~"cafe|restaurant|fast_food|food_court|ice_cream"]["name"](${south},${west},${north},${east});
    node["amenity"~"library|cinema|theatre|arts_centre|community_centre|marketplace|bar|pub"]["name"](${south},${west},${north},${east});
    way["amenity"~"library|cinema|theatre|arts_centre|community_centre|marketplace|bar|pub"]["name"](${south},${west},${north},${east});
    node["leisure"~"park|garden|bowling_alley|sports_centre|fitness_centre"]["name"](${south},${west},${north},${east});
    way["leisure"~"park|garden|bowling_alley|sports_centre|fitness_centre"]["name"](${south},${west},${north},${east});
    node["tourism"~"museum|attraction|gallery|hotel"]["name"](${south},${west},${north},${east});
    way["tourism"~"museum|attraction|gallery|hotel"]["name"](${south},${west},${north},${east});
    node["shop"~"mall|department_store|books"]["name"](${south},${west},${north},${east});
    way["shop"~"mall|department_store|books"]["name"](${south},${west},${north},${east});
    node["natural"="beach"]["name"](${south},${west},${north},${east});
    way["natural"="beach"]["name"](${south},${west},${north},${east});
  );

  out center;
  `;
    try {
        const { pois: responsePois, failures } = await fetchFirstOverpassResponse(query, 12000);
        if (responsePois.length === 0 && failures.length > 0) {
            console.error("Overpass lookups failed:", failures.join("; "));
        }
        const pois = dedupePOIs(responsePois);
        /* ==============================
           FILTER POIs INSIDE POLYGON
        =============================== */
        const filtered = pois.filter((p) => {
            if (!Number.isFinite(p.lat) || !Number.isFinite(p.lon))
                return false;
            const point = turf.point([p.lon, p.lat]);
            return turf.booleanPointInPolygon(point, polygon);
        });
        console.log("Overpass returned:", pois.length);
        console.log("Inside polygon:", filtered.length);
        return filtered;
    }
    catch (err) {
        console.error("Overpass request failed:", err.message);
        return [];
    }
}
//# sourceMappingURL=poi.services.js.map