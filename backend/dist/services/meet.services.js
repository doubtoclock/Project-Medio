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
exports.findMeetPoints = findMeetPoints;
const turf = __importStar(require("@turf/turf"));
const poi_services_1 = require("./poi.services");
const surface_services_1 = require("./surface.services");
const otp_services_1 = require("./otp.services");
const logger_1 = require("../utils/logger");
const MAX_RESULTS = 12;
const POI_TIMEOUT_MS = 3000;
const PRE_RANK_LIMIT = 35;
const MIN_LIVE_RESULTS = 14;
const POI_BATCH_LIMIT = 160;
const MAX_EXPANDED_RADIUS_KM = 50;
const MEET_CACHE_VERSION = "v4";
const MEET_CACHE_BUCKET_DEGREES = 0.003;
const MEET_CACHE_TTL_MS = 45 * 60 * 1000;
const MEET_CACHE_LIMIT = 80;
const MAX_REASONABLE_MEETING_MINUTES = 180;
const MAX_SURFACE_MEETING_MINUTES = 360;
const SURFACE_STEP_MINUTES = 15;
const SURFACE_BUFFER_KM = 2;
const meetCache = new Map();
const pendingMeetSearches = new Map();
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const bucketCoordinate = (value) => (Math.round(value / MEET_CACHE_BUCKET_DEGREES) *
    MEET_CACHE_BUCKET_DEGREES).toFixed(3);
const getMeetCacheKey = (A, B) => [
    MEET_CACHE_VERSION,
    bucketCoordinate(A.lat),
    bucketCoordinate(A.lon),
    bucketCoordinate(B.lat),
    bucketCoordinate(B.lon)
].join(":");
const pruneMeetCache = () => {
    const now = Date.now();
    for (const [key, entry] of meetCache.entries()) {
        if (entry.expiresAt <= now) {
            meetCache.delete(key);
        }
    }
    if (meetCache.size <= MEET_CACHE_LIMIT)
        return;
    const entries = [...meetCache.entries()].sort((left, right) => left[1].lastUsed + left[1].hits * 1000 -
        (right[1].lastUsed + right[1].hits * 1000));
    const removeCount = meetCache.size - MEET_CACHE_LIMIT;
    entries.slice(0, removeCount).forEach(([key]) => meetCache.delete(key));
};
const getCachedMeetResults = (key) => {
    const cached = meetCache.get(key);
    const now = Date.now();
    if (!cached)
        return null;
    if (cached.expiresAt <= now) {
        meetCache.delete(key);
        return null;
    }
    cached.lastUsed = now;
    cached.hits += 1;
    return cached.results;
};
const setCachedMeetResults = (key, results) => {
    meetCache.set(key, {
        results,
        expiresAt: Date.now() + MEET_CACHE_TTL_MS,
        lastUsed: Date.now(),
        hits: 0
    });
    pruneMeetCache();
};
const toPoint = (coords) => turf.point([coords.lon, coords.lat]);
const getDistanceKm = (from, to) => turf.distance(toPoint(from), toPoint(to), { units: "kilometers" });
const getFallbackDuration = (from, to) => {
    const distance = getDistanceKm(from, to);
    const avgSpeed = distance < 3 ? 5 : distance < 15 ? 12 : 20;
    return (distance / avgSpeed) * 3600;
};
const getPoiCategory = (tags = {}) => {
    if (tags.amenity === "cafe")
        return "Cafe";
    if (tags.amenity === "restaurant")
        return "Restaurant";
    if (tags.amenity === "food_court")
        return "Food court";
    if (tags.amenity === "ice_cream")
        return "Dessert";
    if (tags.amenity === "fast_food")
        return "Quick bite";
    if (tags.amenity === "bar" || tags.amenity === "pub")
        return "Bar";
    if (tags.amenity === "library")
        return "Library";
    if (tags.amenity === "cinema")
        return "Cinema";
    if (tags.amenity === "theatre")
        return "Theatre";
    if (tags.amenity === "arts_centre")
        return "Arts center";
    if (tags.amenity === "community_centre")
        return "Community center";
    if (tags.amenity === "marketplace")
        return "Market";
    if (tags.amenity === "college" || tags.amenity === "university") {
        return "Campus";
    }
    if (tags.leisure === "park" || tags.amenity === "park")
        return "Park";
    if (tags.leisure === "garden")
        return "Garden";
    if (tags.leisure === "bowling_alley")
        return "Bowling";
    if (tags.leisure === "sports_centre" ||
        tags.leisure === "fitness_centre") {
        return "Sports";
    }
    if (tags.tourism === "museum")
        return "Museum";
    if (tags.tourism === "gallery")
        return "Gallery";
    if (tags.tourism === "attraction")
        return "Attraction";
    if (tags.tourism === "hotel")
        return "Hotel";
    if (tags.shop === "mall" || tags.shop === "department_store")
        return "Mall";
    if (tags.shop === "books")
        return "Bookstore";
    if (tags.natural === "beach")
        return "Beach";
    return "Place";
};
const getVenueScore = (tags = {}) => {
    const category = getPoiCategory(tags);
    const categoryScores = {
        Cafe: 1,
        Restaurant: 0.92,
        Mall: 0.88,
        "Food court": 0.86,
        Dessert: 0.84,
        Park: 0.82,
        Garden: 0.8,
        Cinema: 0.78,
        Theatre: 0.77,
        Museum: 0.76,
        Gallery: 0.75,
        "Arts center": 0.74,
        Library: 0.72,
        "Community center": 0.71,
        Bar: 0.7,
        Bookstore: 0.69,
        "Quick bite": 0.68,
        Market: 0.67,
        Attraction: 0.66,
        Bowling: 0.65,
        Sports: 0.64,
        Beach: 0.63,
        Hotel: 0.62,
        Campus: 0.62,
        Place: 0.55
    };
    let score = categoryScores[category] ?? categoryScores.Place;
    if (tags.name)
        score += 0.08;
    if (tags.opening_hours)
        score += 0.04;
    if (tags.website || tags.phone || tags["contact:phone"])
        score += 0.03;
    if (tags.brand || tags.operator)
        score += 0.025;
    if (tags.wikidata || tags.wikipedia)
        score += 0.05;
    return clamp(score, 0, 1);
};
const getMeetQualityReason = (differenceMinutes, category) => {
    if (differenceMinutes <= 5) {
        return `Very fair ${category.toLowerCase()} with almost equal travel time`;
    }
    if (differenceMinutes <= 12) {
        return `Balanced ${category.toLowerCase()} with a small travel-time gap`;
    }
    return `${category} with the shortest practical max travel time`;
};
const getSearchRadiusKm = (distanceKm) => {
    if (distanceKm < 3)
        return 1.5;
    if (distanceKm < 20)
        return 3;
    if (distanceKm < 80)
        return 6;
    if (distanceKm < 250)
        return 12;
    return 20;
};
const getExpandedSearchRadii = (baseRadiusKm) => {
    const multipliers = [1, 1.7, 2.8, 4.5, 7];
    const radii = multipliers.map((multiplier) => Math.round(clamp(baseRadiusKm * multiplier, baseRadiusKm, MAX_EXPANDED_RADIUS_KM) * 10) / 10);
    return Array.from(new Set(radii));
};
const getQuickSearchRadiusKm = (baseRadiusKm) => Math.round(clamp(baseRadiusKm * 3, 5, MAX_EXPANDED_RADIUS_KM) * 10) / 10;
const routePoint = (line, distanceKm, fraction) => {
    const point = turf.along(line, distanceKm * fraction, {
        units: "kilometers"
    });
    const [lon, lat] = point.geometry.coordinates;
    return { lat, lon };
};
const offsetPoint = (point, offsetKm, bearing) => {
    if (offsetKm === 0)
        return point;
    const destination = turf.destination(turf.point([point.lon, point.lat]), Math.abs(offsetKm), offsetKm > 0 ? bearing : bearing + 180, { units: "kilometers" });
    const [lon, lat] = destination.geometry.coordinates;
    return { lat, lon };
};
const buildRouteSeeds = (A, B) => {
    const directDistanceKm = getDistanceKm(A, B);
    if (directDistanceKm < 0.1) {
        const bearings = [0, 72, 144, 216, 288];
        return bearings.map((bearing, index) => {
            const point = offsetPoint(A, index === 0 ? 0 : 0.5, bearing);
            return {
                ...point,
                name: index === 0
                    ? "Closest shared meeting area"
                    : `Nearby meeting area ${index + 1}`
            };
        });
    }
    const line = turf.lineString([
        [A.lon, A.lat],
        [B.lon, B.lat]
    ]);
    const bearing = turf.bearing(toPoint(A), toPoint(B)) + 90;
    const offsetKm = clamp(directDistanceKm * 0.04, 0.25, 8);
    const seedConfigs = [
        { fraction: 0.5, offset: 0, name: "Most balanced meeting area" },
        { fraction: 0.47, offset: 0, name: "Balanced option closer to User A" },
        { fraction: 0.53, offset: 0, name: "Balanced option closer to User B" },
        { fraction: 0.5, offset: offsetKm, name: "Route-side meeting area 1" },
        { fraction: 0.5, offset: -offsetKm, name: "Route-side meeting area 2" },
        { fraction: 0.43, offset: offsetKm * 0.5, name: "Wider fair-area option 1" },
        { fraction: 0.57, offset: -offsetKm * 0.5, name: "Wider fair-area option 2" }
    ];
    return seedConfigs.map((seed) => {
        const basePoint = routePoint(line, directDistanceKm, seed.fraction);
        const point = offsetPoint(basePoint, seed.offset, bearing);
        return {
            ...point,
            name: seed.name
        };
    });
};
const getPoiKey = (poi) => `${poi.type || "node"}:${poi.id}`;
const hasUsableName = (poi) => {
    const name = poi.tags?.name?.trim();
    return Boolean(name && name.length > 1);
};
const mergeUniquePois = (existing, next) => {
    const seen = new Set(existing.map(getPoiKey));
    const merged = [...existing];
    next.forEach((poi) => {
        const key = getPoiKey(poi);
        if (seen.has(key))
            return;
        seen.add(key);
        merged.push(poi);
    });
    return merged;
};
const fetchExpandedMeetingPOIs = async (seeds, baseRadiusKm) => {
    let results = [];
    const quickRadiusKm = getQuickSearchRadiusKm(baseRadiusKm);
    const isLookupUnavailable = (err) => err instanceof poi_services_1.POILookupUnavailableError ||
        (err instanceof Error && err.name === "POILookupUnavailableError");
    try {
        const quickPois = await (0, poi_services_1.fetchMeetingPOIsNearPoints)(seeds.slice(0, 1), quickRadiusKm, POI_BATCH_LIMIT, POI_TIMEOUT_MS);
        results = mergeUniquePois(results, quickPois.filter(hasUsableName));
        logger_1.logger.debug("Named meeting venues found in quick search", {
            radiusKm: quickRadiusKm,
            resultCount: results.length,
        });
        if (results.length >= MIN_LIVE_RESULTS) {
            return results.slice(0, POI_BATCH_LIMIT);
        }
    }
    catch (err) {
        logger_1.logger.warn("Quick meeting venue search failed", { error: err });
        if (isLookupUnavailable(err))
            return [];
    }
    for (const radiusKm of getExpandedSearchRadii(baseRadiusKm)) {
        try {
            const pois = await (0, poi_services_1.fetchMeetingPOIsNearPoints)(seeds, radiusKm, POI_BATCH_LIMIT, POI_TIMEOUT_MS);
            const namedPois = pois.filter(hasUsableName);
            results = mergeUniquePois(results, namedPois);
            logger_1.logger.debug("Named meeting venues found in expanded search", {
                radiusKm,
                resultCount: results.length,
            });
            if (results.length >= MIN_LIVE_RESULTS)
                break;
        }
        catch (err) {
            logger_1.logger.warn("Meeting venue search step failed", {
                radiusKm,
                error: err,
            });
            if (isLookupUnavailable(err))
                break;
        }
    }
    return results.slice(0, POI_BATCH_LIMIT);
};
const preRankCandidate = (poi, A, B, directDistanceKm) => {
    const point = { lat: poi.lat, lon: poi.lon };
    const distA = getDistanceKm(A, point);
    const distB = getDistanceKm(B, point);
    const totalDistance = distA + distB;
    const maxDistance = Math.max(distA, distB);
    const balanceRatio = Math.abs(distA - distB) / Math.max(totalDistance, 1);
    const detourRatio = totalDistance / Math.max(directDistanceKm, 1);
    return {
        poi,
        rank: maxDistance * 0.45 +
            totalDistance * 0.2 +
            balanceRatio * 18 +
            detourRatio * 4 -
            getVenueScore(poi.tags) * 5
    };
};
const scoreCandidateWithDurations = (poi, timeA, timeB) => {
    const diff = Math.abs(timeA - timeB);
    const average = (timeA + timeB) / 2;
    const maxTravelTime = Math.max(timeA, timeB);
    const category = getPoiCategory(poi.tags);
    const venueScore = getVenueScore(poi.tags);
    const score = (maxTravelTime / 60) * 0.42 +
        (average / 60) * 0.24 +
        (diff / 60) * 0.26 -
        venueScore * 10;
    return {
        id: poi.id,
        name: poi.tags?.name || "Recommended meeting spot",
        lat: poi.lat,
        lon: poi.lon,
        category,
        source: poi.source,
        travelTimeA: Math.round(timeA / 60),
        travelTimeB: Math.round(timeB / 60),
        difference: Math.round(diff / 60),
        average: Math.round(average / 60),
        maxTravelTime: Math.round(maxTravelTime / 60),
        score: Number(score.toFixed(2)),
        reason: getMeetQualityReason(Math.round(diff / 60), category)
    };
};
const scoreCandidate = (poi, A, B) => {
    const point = { lat: poi.lat, lon: poi.lon };
    const timeA = getFallbackDuration(A, point);
    const timeB = getFallbackDuration(B, point);
    return scoreCandidateWithDurations(poi, timeA, timeB);
};
const getOtpOrFallbackDuration = async (from, to) => {
    const duration = await (0, otp_services_1.getOtpDuration)(from.lat, from.lon, to.lat, to.lon);
    return duration && duration > 0 ? duration : getFallbackDuration(from, to);
};
const scoreCandidateWithOtpFallback = async (poi, A, B) => {
    const point = { lat: poi.lat, lon: poi.lon };
    const [timeA, timeB] = await Promise.all([
        getOtpOrFallbackDuration(A, point),
        getOtpOrFallbackDuration(B, point)
    ]);
    return scoreCandidateWithDurations(poi, timeA, timeB);
};
const diversifyResults = (pois) => {
    const selected = [];
    const selectedIds = new Set();
    const categoryCounts = new Map();
    const categoryLimits = [2, 3, MAX_RESULTS];
    for (const limit of categoryLimits) {
        for (const poi of pois) {
            if (selected.length >= MAX_RESULTS)
                return selected;
            if (selectedIds.has(poi.id))
                continue;
            const count = categoryCounts.get(poi.category) ?? 0;
            if (count >= limit)
                continue;
            selected.push(poi);
            selectedIds.add(poi.id);
            categoryCounts.set(poi.category, count + 1);
        }
    }
    return selected;
};
const rankScoredResults = (pois) => diversifyResults(pois.sort((a, b) => {
    if (a.score !== b.score)
        return a.score - b.score;
    if (a.maxTravelTime !== b.maxTravelTime) {
        return a.maxTravelTime - b.maxTravelTime;
    }
    return a.difference - b.difference;
}));
const findSurfaceMeetPois = async (A, B) => {
    const directDuration = await (0, otp_services_1.getOtpDuration)(A.lat, A.lon, B.lat, B.lon, 3500);
    if (!directDuration || directDuration <= 0) {
        logger_1.logger.debug("Surface fallback skipped because OTP is unavailable");
        return [];
    }
    let meetingMinutes = Math.ceil(directDuration / 2 / 60);
    meetingMinutes = Math.min(meetingMinutes, MAX_REASONABLE_MEETING_MINUTES);
    let polygon = null;
    while (meetingMinutes <= MAX_SURFACE_MEETING_MINUTES) {
        try {
            polygon = await (0, surface_services_1.generateSurfaceIntersection)(A, B, meetingMinutes);
            if (polygon)
                break;
        }
        catch (err) {
            logger_1.logger.warn("Surface fallback generation failed", { error: err });
        }
        meetingMinutes += SURFACE_STEP_MINUTES;
    }
    if (!polygon)
        return [];
    let pois = await (0, poi_services_1.fetchMeetingPOIs)(polygon);
    if (pois.length === 0) {
        try {
            const expandedPolygon = turf.buffer(polygon, SURFACE_BUFFER_KM, {
                units: "kilometers"
            });
            if (expandedPolygon) {
                pois = await (0, poi_services_1.fetchMeetingPOIs)(expandedPolygon);
            }
        }
        catch (err) {
            logger_1.logger.warn("Surface fallback buffer failed", { error: err });
        }
    }
    return pois.filter(hasUsableName);
};
const findMeetPointsWithSurfaceFallback = async (A, B, directDistanceKm) => {
    const surfacePois = await findSurfaceMeetPois(A, B);
    if (surfacePois.length === 0)
        return [];
    const candidates = surfacePois.map((poi) => ({
        ...poi,
        source: "osm"
    }));
    const candidatePois = candidates
        .map((poi) => preRankCandidate(poi, A, B, directDistanceKm))
        .sort((left, right) => left.rank - right.rank)
        .map((candidate) => candidate.poi)
        .slice(0, PRE_RANK_LIMIT);
    const enriched = await Promise.all(candidatePois.map((poi) => scoreCandidateWithOtpFallback(poi, A, B)));
    return rankScoredResults(enriched);
};
const findMeetPointsLive = async (A, B) => {
    const startedAt = Date.now();
    const directDistanceKm = getDistanceKm(A, B);
    const seeds = buildRouteSeeds(A, B);
    logger_1.logger.info("Meeting point search started", {
        directDistanceKm: Number(directDistanceKm.toFixed(2)),
    });
    const poiRadiusKm = getSearchRadiusKm(directDistanceKm);
    const livePois = await fetchExpandedMeetingPOIs(seeds, poiRadiusKm);
    const osmCandidates = livePois.map((poi) => ({
        ...poi,
        source: "osm"
    }));
    if (osmCandidates.length === 0) {
        logger_1.logger.info("No named meeting venues found after expanded search", {
            maxRadiusKm: MAX_EXPANDED_RADIUS_KM,
        });
        const surfaceResults = await findMeetPointsWithSurfaceFallback(A, B, directDistanceKm);
        if (surfaceResults.length > 0) {
            logger_1.logger.info("Surface fallback returned meeting results", {
                resultCount: surfaceResults.length,
            });
            return surfaceResults;
        }
        return [];
    }
    const candidatePois = osmCandidates
        .map((poi) => preRankCandidate(poi, A, B, directDistanceKm))
        .sort((left, right) => left.rank - right.rank)
        .map((candidate) => candidate.poi)
        .slice(0, PRE_RANK_LIMIT);
    const enriched = candidatePois.map((poi) => scoreCandidate(poi, A, B));
    const ranked = rankScoredResults(enriched);
    logger_1.logger.info("Meeting point search completed", {
        resultCount: ranked.length,
        durationMs: Date.now() - startedAt,
    });
    return ranked;
};
async function findMeetPoints(A, B) {
    const cacheKey = getMeetCacheKey(A, B);
    const cachedResults = getCachedMeetResults(cacheKey);
    if (cachedResults) {
        logger_1.logger.debug("Meet cache hit");
        return cachedResults;
    }
    const pendingSearch = pendingMeetSearches.get(cacheKey);
    if (pendingSearch) {
        logger_1.logger.debug("Meet cache pending hit");
        return pendingSearch;
    }
    const search = findMeetPointsLive(A, B)
        .then((results) => {
        setCachedMeetResults(cacheKey, results);
        return results;
    })
        .finally(() => {
        pendingMeetSearches.delete(cacheKey);
    });
    pendingMeetSearches.set(cacheKey, search);
    return search;
}
//# sourceMappingURL=meet.services.js.map