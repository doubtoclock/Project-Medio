"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const security_middleware_1 = require("../middlewares/security.middleware");
const validation_middleware_1 = require("../middlewares/validation.middleware");
const logger_1 = require("../utils/logger");
const api_validator_1 = require("../validators/api.validator");
const router = (0, express_1.Router)();
const PHOTON_TIMEOUT_MS = 1800;
const SEARCH_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const SEARCH_CACHE_LIMIT = 160;
const MIN_SIMILAR_QUERY_LENGTH = 5;
const MAX_SEARCH_RESULTS = 5;
const PHOTON_RESULT_LIMIT = 12;
const searchCache = new Map();
const pendingSearches = new Map();
const tokenAliases = {
    ave: "avenue",
    av: "avenue",
    blvd: "boulevard",
    ctr: "center",
    centre: "center",
    dr: "drive",
    expwy: "expressway",
    hwy: "highway",
    ln: "lane",
    rd: "road",
    st: "street",
    stn: "station"
};
const getQueryTokens = (query) => query
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .map((token) => tokenAliases[token] ?? token)
    .filter((token) => token.length > 1);
const getSearchCacheKey = (query) => getQueryTokens(query).sort().join(" ");
const normalizeSuggestionName = (name) => name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
const dedupeLocationSuggestions = (suggestions) => {
    const seen = new Set();
    const unique = [];
    for (const suggestion of suggestions) {
        const name = suggestion.name.trim();
        const key = normalizeSuggestionName(name);
        if (!key ||
            seen.has(key) ||
            !Number.isFinite(suggestion.lat) ||
            !Number.isFinite(suggestion.lng)) {
            continue;
        }
        seen.add(key);
        unique.push({
            name,
            lat: suggestion.lat,
            lng: suggestion.lng
        });
        if (unique.length >= MAX_SEARCH_RESULTS)
            break;
    }
    return unique;
};
const getBigrams = (value) => {
    const compact = value.replace(/\s+/g, "");
    if (compact.length < 2)
        return [compact];
    const bigrams = [];
    for (let index = 0; index < compact.length - 1; index += 1) {
        bigrams.push(compact.slice(index, index + 2));
    }
    return bigrams;
};
const getDiceSimilarity = (left, right) => {
    if (left === right)
        return 1;
    if (!left || !right)
        return 0;
    const rightCounts = new Map();
    getBigrams(right).forEach((bigram) => {
        rightCounts.set(bigram, (rightCounts.get(bigram) ?? 0) + 1);
    });
    let overlap = 0;
    getBigrams(left).forEach((bigram) => {
        const count = rightCounts.get(bigram) ?? 0;
        if (count === 0)
            return;
        overlap += 1;
        rightCounts.set(bigram, count - 1);
    });
    return (2 * overlap) / (getBigrams(left).length + getBigrams(right).length);
};
const areSimilarQueries = (left, right) => {
    if (left === right)
        return true;
    if (left.length < MIN_SIMILAR_QUERY_LENGTH ||
        right.length < MIN_SIMILAR_QUERY_LENGTH) {
        return false;
    }
    const shorter = left.length <= right.length ? left : right;
    const longer = left.length > right.length ? left : right;
    if (longer.startsWith(shorter) && longer.length - shorter.length <= 3) {
        return true;
    }
    return getDiceSimilarity(left, right) >= 0.84;
};
const pruneSearchCache = () => {
    const now = Date.now();
    for (const [key, entry] of searchCache.entries()) {
        if (entry.expiresAt <= now) {
            searchCache.delete(key);
        }
    }
    if (searchCache.size <= SEARCH_CACHE_LIMIT)
        return;
    const entries = [...searchCache.entries()].sort((left, right) => left[1].lastUsed + left[1].hits * 1000 -
        (right[1].lastUsed + right[1].hits * 1000));
    const removeCount = searchCache.size - SEARCH_CACHE_LIMIT;
    entries.slice(0, removeCount).forEach(([key]) => searchCache.delete(key));
};
const getCachedSearch = (key) => {
    const now = Date.now();
    const exactEntry = searchCache.get(key);
    if (exactEntry && exactEntry.expiresAt > now) {
        exactEntry.lastUsed = now;
        exactEntry.hits += 1;
        return exactEntry;
    }
    if (exactEntry) {
        searchCache.delete(key);
    }
    for (const [cachedKey, entry] of searchCache.entries()) {
        if (entry.expiresAt <= now) {
            searchCache.delete(cachedKey);
            continue;
        }
        if (!areSimilarQueries(key, cachedKey))
            continue;
        entry.lastUsed = now;
        entry.hits += 1;
        return entry;
    }
    return null;
};
const setCachedSearch = (key, results) => {
    const normalizedResults = dedupeLocationSuggestions(results);
    searchCache.set(key, {
        results: normalizedResults,
        expiresAt: Date.now() + SEARCH_CACHE_TTL_MS,
        lastUsed: Date.now(),
        hits: 0
    });
    pruneSearchCache();
};
const fetchPhotonSuggestions = async (query) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PHOTON_TIMEOUT_MS);
    try {
        const response = await fetch(`https://photon.komoot.io/api?q=${encodeURIComponent(query)}&limit=${PHOTON_RESULT_LIMIT}&lat=19.076&lon=72.8777`, {
            headers: {
                "User-Agent": "Medio/1.0 (location-search)"
            },
            signal: controller.signal
        });
        if (!response.ok)
            return [];
        const data = (await response.json());
        const suggestions = (data.features ?? [])
            .map((item) => ({
            name: item.properties.name ||
                item.properties.street ||
                item.properties.city ||
                "Unnamed location",
            lat: item.geometry.coordinates[1],
            lng: item.geometry.coordinates[0]
        }))
            .filter((item) => item.name !== "Unnamed location" &&
            Number.isFinite(item.lat) &&
            Number.isFinite(item.lng));
        return dedupeLocationSuggestions(suggestions);
    }
    finally {
        clearTimeout(timeout);
    }
};
router.get("/", security_middleware_1.searchRateLimiter, (0, validation_middleware_1.validateQuery)(api_validator_1.searchQuerySchema), async (req, res) => {
    const query = req.query.q;
    const cacheKey = getSearchCacheKey(query);
    const cached = getCachedSearch(cacheKey);
    if (cached) {
        res.setHeader("X-Medio-Cache", "hit");
        res.json(cached.results);
        return;
    }
    try {
        const pending = pendingSearches.get(cacheKey) ?? fetchPhotonSuggestions(query);
        if (!pendingSearches.has(cacheKey)) {
            pendingSearches.set(cacheKey, pending);
        }
        const results = await pending;
        if (results.length > 0) {
            setCachedSearch(cacheKey, results);
        }
        res.json(results);
    }
    catch (error) {
        logger_1.logger.error("Photon search failed", { error });
        res.status(500).json([]);
    }
    finally {
        pendingSearches.delete(cacheKey);
    }
});
exports.default = router;
//# sourceMappingURL=search.routes.js.map