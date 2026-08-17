"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const mongoose_1 = __importDefault(require("mongoose"));
const security_middleware_1 = require("../middlewares/security.middleware");
const validation_middleware_1 = require("../middlewares/validation.middleware");
const db_1 = require("../lib/db");
const cached_place_1 = require("../models/cached-place");
const logger_1 = require("../utils/logger");
const service_area_1 = require("../utils/service-area");
const api_validator_1 = require("../validators/api.validator");
const fuzzy_1 = require("../utils/fuzzy");
const place_search_1 = require("../utils/place-search");
const router = (0, express_1.Router)();
const PHOTON_TIMEOUT_MS = 8000;
const SEARCH_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const SEARCH_CACHE_LIMIT = 160;
const POPULARITY_CACHE_LIMIT = 500;
const MIN_SIMILAR_QUERY_LENGTH = 5;
const MAX_SEARCH_RESULTS = 8;
const PHOTON_RESULT_LIMIT = 16;
const DB_PLACE_CACHE_TTL_MS = 90 * 24 * 60 * 60 * 1000;
const DB_PLACE_CANDIDATE_LIMIT = 120;
const MIN_CONFIDENT_CACHE_RESULTS = 4;
const STRONG_SINGLE_CACHE_SCORE = 74;
const searchCache = new Map();
const pendingSearches = new Map();
const popularityCache = new Map();
const curatedLocations = [
    {
        name: "Mumbai, Maharashtra",
        lat: 19.0760,
        lng: 72.8777,
        keywords: ["mumbai"]
    },
    {
        name: "Marine Drive, Mumbai",
        lat: 18.9430,
        lng: 72.8238,
        keywords: ["marine drive", "marine"]
    },
    {
        name: "Matunga, Mumbai",
        lat: 19.0269,
        lng: 72.8553,
        keywords: ["matunga"]
    },
    {
        name: "Juhu, Mumbai",
        lat: 19.1075,
        lng: 72.8263,
        keywords: ["juhu"]
    },
    {
        name: "Andheri West, Mumbai",
        lat: 19.1363,
        lng: 72.8296,
        keywords: ["andheri west", "andheri"]
    },
    {
        name: "Andheri East, Mumbai",
        lat: 19.1155,
        lng: 72.8727,
        keywords: ["andheri east", "andheri"]
    },
    {
        name: "Bandra West, Mumbai",
        lat: 19.0596,
        lng: 72.8295,
        keywords: ["bandra west", "bandra"]
    },
    {
        name: "Bandra East, Mumbai",
        lat: 19.0624,
        lng: 72.8497,
        keywords: ["bandra east", "bandra"]
    },
    {
        name: "Dadar, Mumbai",
        lat: 19.0178,
        lng: 72.8478,
        keywords: ["dadar"]
    },
    {
        name: "Worli, Mumbai",
        lat: 19.0176,
        lng: 72.8162,
        keywords: ["worli"]
    },
    {
        name: "Lower Parel, Mumbai",
        lat: 18.9959,
        lng: 72.8307,
        keywords: ["lower parel", "parel"]
    },
    {
        name: "Powai, Mumbai",
        lat: 19.1176,
        lng: 72.9060,
        keywords: ["powai"]
    },
    {
        name: "Goregaon, Mumbai",
        lat: 19.1663,
        lng: 72.8526,
        keywords: ["goregaon"]
    },
    {
        name: "Malad, Mumbai",
        lat: 19.1860,
        lng: 72.8485,
        keywords: ["malad"]
    },
    {
        name: "Borivali, Mumbai",
        lat: 19.2290,
        lng: 72.8574,
        keywords: ["borivali"]
    },
    {
        name: "Colaba, Mumbai",
        lat: 18.9067,
        lng: 72.8147,
        keywords: ["colaba"]
    },
    {
        name: "Churchgate, Mumbai",
        lat: 18.9353,
        lng: 72.8272,
        keywords: ["churchgate"]
    },
    {
        name: "Fort, Mumbai",
        lat: 18.9333,
        lng: 72.8340,
        keywords: ["fort", "mumbai fort", "fort mumbai"]
    },
    {
        name: "Kala Ghoda, Fort, Mumbai",
        lat: 18.9275,
        lng: 72.8315,
        keywords: ["kala ghoda", "kala ghoda fort", "fort kala ghoda"]
    },
    {
        name: "BKC, Bandra Kurla Complex, Mumbai",
        lat: 19.0663,
        lng: 72.8670,
        keywords: ["bkc", "bandra kurla complex"]
    },
    {
        name: "Versova, Andheri West, Mumbai",
        lat: 19.1312,
        lng: 72.8146,
        keywords: ["versova", "versova andheri"]
    },
    {
        name: "Mira Road, Mira Bhayandar",
        lat: 19.2813,
        lng: 72.8567,
        keywords: ["mira", "mira road", "mira bhayandar"]
    },
    {
        name: "Bhayandar, Mira Bhayandar",
        lat: 19.3002,
        lng: 72.8544,
        keywords: ["bhayandar", "mira bhayandar"]
    },
    {
        name: "Maxus Mall, Bhayandar West, Mira Bhayandar",
        lat: 19.2965,
        lng: 72.8483,
        keywords: [
            "maxus",
            "maxus mall",
            "maxus mall bhayandar",
            "maxus mall bhayander",
            "maxus mall mira bhayandar",
            "bhayandar maxus mall",
            "bhayander maxus mall"
        ]
    },
    {
        name: "Phoenix Palladium, Lower Parel, Mumbai",
        lat: 18.9950,
        lng: 72.8240,
        keywords: [
            "phoenix palladium",
            "palladium",
            "palladium mall",
            "phoenix palladium lower parel",
            "phoenix palladium mumbai",
            "phoenix mall lower parel",
            "high street phoenix",
            "high street phoenix lower parel"
        ]
    },
    {
        name: "Santacruz West, Mumbai",
        lat: 19.0815,
        lng: 72.8379,
        keywords: ["santacruz west", "santacruz", "santa cruz"]
    },
    {
        name: "Santacruz East, Mumbai",
        lat: 19.0811,
        lng: 72.8506,
        keywords: ["santacruz east", "santacruz", "santa cruz"]
    },
    {
        name: "Vile Parle West, Mumbai",
        lat: 19.1030,
        lng: 72.8400,
        keywords: ["vile parle west", "vile parle", "parle"]
    },
    {
        name: "Vile Parle East, Mumbai",
        lat: 19.1007,
        lng: 72.8567,
        keywords: ["vile parle east", "vile parle", "parle"]
    },
    {
        name: "Khar West, Mumbai",
        lat: 19.0700,
        lng: 72.8338,
        keywords: ["khar west", "khar"]
    },
    {
        name: "Khar East, Mumbai",
        lat: 19.0696,
        lng: 72.8465,
        keywords: ["khar east", "khar"]
    },
    {
        name: "Mahim, Mumbai",
        lat: 19.0350,
        lng: 72.8402,
        keywords: ["mahim"]
    },
    {
        name: "Prabhadevi, Mumbai",
        lat: 19.0169,
        lng: 72.8295,
        keywords: ["prabhadevi"]
    },
    {
        name: "Chembur, Mumbai",
        lat: 19.0622,
        lng: 72.9024,
        keywords: ["chembur"]
    },
    {
        name: "Ghatkopar, Mumbai",
        lat: 19.0856,
        lng: 72.9080,
        keywords: ["ghatkopar"]
    },
    {
        name: "Kurla, Mumbai",
        lat: 19.0726,
        lng: 72.8845,
        keywords: ["kurla"]
    },
    {
        name: "Sion, Mumbai",
        lat: 19.0434,
        lng: 72.8633,
        keywords: ["sion"]
    },
    {
        name: "Mulund, Mumbai",
        lat: 19.1726,
        lng: 72.9425,
        keywords: ["mulund"]
    },
    {
        name: "Kandivali, Mumbai",
        lat: 19.2058,
        lng: 72.8698,
        keywords: ["kandivali"]
    },
    {
        name: "Dahisar, Mumbai",
        lat: 19.2575,
        lng: 72.8636,
        keywords: ["dahisar"]
    }
];
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
    .filter((token) => token.length > 0);
const getSearchCacheKey = (query) => getQueryTokens(query).sort().join(" ");
const normalizeSuggestionName = (name) => name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
const getPrimarySuggestionName = (name) => name.split(",")[0];
const matchesQueryPrefix = (suggestion, query) => {
    const normalizedQuery = normalizeSuggestionName(query);
    if (!normalizedQuery)
        return false;
    const normalizedName = normalizeSuggestionName(suggestion.name);
    if (!normalizedName)
        return false;
    if (normalizeSuggestionName(getPrimarySuggestionName(suggestion.name)).startsWith(normalizedQuery)) {
        return true;
    }
    if (normalizedName.includes(normalizedQuery))
        return true;
    const queryTokens = normalizedQuery.split(" ").filter(Boolean);
    return (queryTokens.length > 1 &&
        queryTokens.every((token) => normalizedName.includes(token)));
};
const filterSuggestionsForQuery = (suggestions, query) => suggestions.filter((suggestion) => matchesQueryPrefix(suggestion, query));
const dedupeLocationSuggestions = (suggestions, limit = MAX_SEARCH_RESULTS) => {
    const seen = new Set();
    const unique = [];
    for (const suggestion of suggestions) {
        const name = suggestion.name.trim();
        const key = normalizeSuggestionName(name);
        if (!key ||
            seen.has(key) ||
            !Number.isFinite(suggestion.lat) ||
            !Number.isFinite(suggestion.lng) ||
            !(0, service_area_1.isWithinServiceAreaBounds)(suggestion)) {
            continue;
        }
        seen.add(key);
        unique.push({
            name,
            lat: suggestion.lat,
            lng: suggestion.lng
        });
        if (unique.length >= limit)
            break;
    }
    return unique;
};
const getPopularityKey = (suggestion) => `${normalizeSuggestionName(suggestion.name)}:${suggestion.lat.toFixed(4)},${suggestion.lng.toFixed(4)}`;
const getPopularityScore = (suggestion) => {
    const entry = popularityCache.get(getPopularityKey(suggestion));
    if (!entry)
        return 0;
    const daysSinceSelected = (Date.now() - entry.lastSelected) / (24 * 60 * 60 * 1000);
    return entry.count * 4 + Math.max(0, 7 - daysSinceSelected);
};
const rankSuggestionsByPopularity = (suggestions) => dedupeLocationSuggestions(suggestions)
    .map((suggestion, index) => ({
    suggestion,
    score: getPopularityScore(suggestion),
    index
}))
    .sort((left, right) => right.score - left.score ||
    left.index - right.index)
    .map(({ suggestion }) => suggestion)
    .slice(0, MAX_SEARCH_RESULTS);
const getPopularSuggestionsForQuery = (query) => {
    const normalizedQuery = normalizeSuggestionName(query);
    if (!normalizedQuery)
        return [];
    return [...popularityCache.values()]
        .filter(({ suggestion }) => matchesQueryPrefix(suggestion, normalizedQuery))
        .sort((left, right) => right.count - left.count ||
        right.lastSelected - left.lastSelected)
        .map(({ suggestion }) => suggestion)
        .slice(0, MAX_SEARCH_RESULTS);
};
const prunePopularityCache = () => {
    if (popularityCache.size <= POPULARITY_CACHE_LIMIT)
        return;
    const removeCount = popularityCache.size - POPULARITY_CACHE_LIMIT;
    [...popularityCache.entries()]
        .sort((left, right) => left[1].count - right[1].count ||
        left[1].lastSelected - right[1].lastSelected)
        .slice(0, removeCount)
        .forEach(([key]) => popularityCache.delete(key));
};
const recordLocationSelection = (suggestion) => {
    const [normalized] = dedupeLocationSuggestions([suggestion]);
    if (!normalized)
        return false;
    const key = getPopularityKey(normalized);
    const existing = popularityCache.get(key);
    popularityCache.set(key, {
        suggestion: normalized,
        count: (existing?.count ?? 0) + 1,
        lastSelected: Date.now()
    });
    prunePopularityCache();
    return true;
};
const getPlaceCacheExpiry = () => new Date(Date.now() + DB_PLACE_CACHE_TTL_MS);
const buildCacheablePlace = (place) => {
    const aliasValues = Array.from(new Set([
        place.name,
        ...(place.aliases ?? []),
        ...(place.addressParts ?? []),
    ].map((value) => value.trim()).filter(Boolean))).slice(0, 24);
    const normalizedAliases = Array.from(new Set(aliasValues.map(place_search_1.normalizePlaceText).filter(Boolean)));
    const normalizedName = (0, place_search_1.normalizePlaceText)(place.name);
    const addressParts = Array.from(new Set((place.addressParts ?? []).map((part) => part.trim()).filter(Boolean))).slice(0, 24);
    const searchValues = [place.name, ...aliasValues, ...addressParts];
    return {
        serviceAreaId: service_area_1.DEFAULT_SERVICE_AREA.id,
        canonicalName: place.name.trim(),
        normalizedName,
        aliases: aliasValues.filter((alias) => (0, place_search_1.normalizePlaceText)(alias) !== normalizedName),
        normalizedAliases: normalizedAliases.filter((alias) => alias !== normalizedName),
        addressParts,
        searchTokens: (0, place_search_1.getPlaceSearchTokens)(searchValues),
        searchGrams: (0, place_search_1.getPlaceSearchGrams)(searchValues),
        lat: place.lat,
        lng: place.lng,
        source: place.source,
        sourceId: place.sourceId,
        lastSeenAt: new Date(),
        expiresAt: getPlaceCacheExpiry(),
    };
};
const getCanonicalPlaceKey = (place) => `${(0, place_search_1.normalizePlaceText)(place.name)}:${place.lat.toFixed(4)}:${place.lng.toFixed(4)}`;
const upsertCachedPlaces = async (places) => {
    if (!(0, db_1.isMongoReady)())
        return;
    const cacheablePlaces = dedupeLocationSuggestions(places, DB_PLACE_CANDIDATE_LIMIT)
        .map((suggestion) => places.find((place) => getCanonicalPlaceKey(place) === getCanonicalPlaceKey(suggestion)) ?? suggestion)
        .map((place) => buildCacheablePlace(place))
        .filter((place) => place.normalizedName && place.searchGrams.length > 0);
    if (cacheablePlaces.length === 0)
        return;
    await Promise.allSettled(cacheablePlaces.map((place) => {
        const selector = place.sourceId
            ? {
                serviceAreaId: place.serviceAreaId,
                source: place.source,
                sourceId: place.sourceId,
            }
            : {
                serviceAreaId: place.serviceAreaId,
                normalizedName: place.normalizedName,
                lat: mongoose_1.default.trusted({ $gte: place.lat - 0.0007, $lte: place.lat + 0.0007 }),
                lng: mongoose_1.default.trusted({ $gte: place.lng - 0.0007, $lte: place.lng + 0.0007 }),
            };
        return cached_place_1.CachedPlace.updateOne(selector, {
            $set: {
                canonicalName: place.canonicalName,
                normalizedName: place.normalizedName,
                addressParts: place.addressParts,
                searchTokens: place.searchTokens,
                searchGrams: place.searchGrams,
                lat: place.lat,
                lng: place.lng,
                source: place.source,
                sourceId: place.sourceId,
                lastSeenAt: place.lastSeenAt,
                expiresAt: place.expiresAt,
            },
            $addToSet: {
                aliases: { $each: place.aliases },
                normalizedAliases: { $each: place.normalizedAliases },
            },
            $setOnInsert: {
                selectedCount: 0,
            },
        }, { upsert: true });
    }));
};
let curatedCacheSeeded = false;
const ensureCuratedPlaceCache = async () => {
    if (curatedCacheSeeded || !(0, db_1.isMongoReady)())
        return;
    curatedCacheSeeded = true;
    await upsertCachedPlaces(curatedLocations.map(({ keywords, ...location }) => ({
        ...location,
        source: "curated",
        sourceId: `curated:${(0, place_search_1.normalizePlaceText)(location.name)}`,
        aliases: keywords,
        addressParts: location.name.split(",").map((part) => part.trim()),
    })));
};
const cachedPlacesToSuggestions = (places, query) => places
    .map((place, index) => ({
    suggestion: {
        name: place.canonicalName,
        lat: place.lat,
        lng: place.lng,
    },
    score: (0, place_search_1.scoreCachedPlace)(query, place),
    index,
}))
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score ||
    getPopularityScore(right.suggestion) - getPopularityScore(left.suggestion) ||
    left.index - right.index)
    .map(({ suggestion, score }) => ({ suggestion, score }));
const searchCachedPlaces = async (query) => {
    if (!(0, db_1.isMongoReady)())
        return [];
    try {
        await ensureCuratedPlaceCache();
        const normalizedQuery = (0, place_search_1.normalizePlaceText)(query);
        const queryTokens = (0, place_search_1.getPlaceSearchTokens)([query]);
        const queryGrams = (0, place_search_1.getPlaceSearchGrams)([query]);
        if (!normalizedQuery || queryGrams.length === 0)
            return [];
        const now = new Date();
        const prefixPattern = new RegExp(`^${normalizedQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`);
        const candidates = await cached_place_1.CachedPlace.find({
            serviceAreaId: service_area_1.DEFAULT_SERVICE_AREA.id,
            expiresAt: mongoose_1.default.trusted({ $gt: now }),
            $or: [
                { normalizedName: prefixPattern },
                { normalizedAliases: prefixPattern },
                { searchTokens: mongoose_1.default.trusted({ $in: queryTokens }) },
                { searchGrams: mongoose_1.default.trusted({ $in: queryGrams }) },
            ],
        })
            .sort({ selectedCount: -1, lastSeenAt: -1 })
            .limit(DB_PLACE_CANDIDATE_LIMIT)
            .lean();
        return cachedPlacesToSuggestions(candidates, query);
    }
    catch (error) {
        logger_1.logger.warn("Shared place cache search failed; continuing with live/local search", { error });
        return [];
    }
};
const rankConfidenceResults = (items) => {
    const seen = new Set();
    const ranked = [];
    for (const item of items.sort((left, right) => right.score - left.score)) {
        const key = getPopularityKey(item.suggestion);
        if (seen.has(key))
            continue;
        seen.add(key);
        ranked.push(item.suggestion);
        if (ranked.length >= MAX_SEARCH_RESULTS)
            break;
    }
    return ranked;
};
const scoreSuggestionsForQuery = (suggestions, query) => dedupeLocationSuggestions(suggestions, DB_PLACE_CANDIDATE_LIMIT).map((suggestion, index) => ({
    suggestion,
    score: (0, fuzzy_1.getFuzzyScore)(query, suggestion.name) +
        (matchesQueryPrefix(suggestion, query) ? 35 : 0) +
        Math.min(8, getPopularityScore(suggestion)) -
        index * 0.01,
}));
const getLocalFuzzySuggestions = (query) => {
    const localCandidates = [
        ...curatedLocations,
        ...Array.from(popularityCache.values()).map((entry) => entry.suggestion),
    ];
    const fuzzyMatches = dedupeLocationSuggestions(localCandidates, DB_PLACE_CANDIDATE_LIMIT)
        .map((candidate, index) => {
        const keywords = candidate.keywords || [];
        const fuzzyScore = (0, fuzzy_1.getFuzzyScore)(query, candidate.name, keywords);
        const prefixScore = matchesQueryPrefix(candidate, query) ? 35 : 0;
        const popularityScore = Math.min(8, getPopularityScore(candidate));
        return {
            suggestion: candidate,
            score: fuzzyScore + prefixScore + popularityScore - index * 0.01,
            isMatch: prefixScore > 0 ||
                (0, fuzzy_1.isFuzzyMatch)(query, candidate.name, keywords) ||
                fuzzyScore >= 70,
        };
    })
        .filter(({ isMatch }) => isMatch);
    return rankConfidenceResults(fuzzyMatches);
};
const recordCachedPlaceSelection = async (suggestion) => {
    if (!(0, db_1.isMongoReady)())
        return;
    await ensureCuratedPlaceCache();
    const [normalized] = dedupeLocationSuggestions([suggestion]);
    if (!normalized)
        return;
    const normalizedName = (0, place_search_1.normalizePlaceText)(normalized.name);
    const now = new Date();
    const nearbyWindow = {
        lat: mongoose_1.default.trusted({ $gte: normalized.lat - 0.0007, $lte: normalized.lat + 0.0007 }),
        lng: mongoose_1.default.trusted({ $gte: normalized.lng - 0.0007, $lte: normalized.lng + 0.0007 }),
    };
    await cached_place_1.CachedPlace.updateOne({
        serviceAreaId: service_area_1.DEFAULT_SERVICE_AREA.id,
        normalizedName,
        ...nearbyWindow,
    }, {
        $inc: { selectedCount: 1 },
        $set: {
            lastSelectedAt: now,
            lastSeenAt: now,
            expiresAt: getPlaceCacheExpiry(),
        },
    });
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
    const normalizedResults = rankSuggestionsByPopularity(results);
    searchCache.set(key, {
        results: normalizedResults,
        expiresAt: Date.now() + SEARCH_CACHE_TTL_MS,
        lastUsed: Date.now(),
        hits: 0
    });
    pruneSearchCache();
};
const getCuratedSuggestions = (query) => {
    const normalizedQuery = normalizeSuggestionName(query);
    if (!normalizedQuery)
        return [];
    return curatedLocations
        .map((location) => {
        const bestScore = Math.max(...location.keywords.map((keyword) => {
            const normalizedKeyword = normalizeSuggestionName(keyword);
            if (normalizedKeyword === normalizedQuery)
                return 4;
            if (normalizedKeyword.startsWith(`${normalizedQuery} `))
                return 3;
            if (normalizedKeyword.startsWith(normalizedQuery))
                return 2;
            return 0;
        }));
        return { location, bestScore };
    })
        .filter(({ bestScore }) => bestScore > 0)
        .sort((left, right) => right.bestScore - left.bestScore)
        .map(({ location }) => location)
        .map(({ keywords, ...location }) => location);
};
const isWardCode = (part) => /^[\p{L}\p{N}/-]+\s+ward$/iu.test(part.trim());
const getPhotonDisplayName = (properties) => {
    const primary = properties.name || properties.street || properties.city;
    if (!primary)
        return "Unnamed location";
    const context = [
        properties.locality,
        properties.neighbourhood,
        properties.suburb,
        properties.municipality,
        properties.district,
        properties.city,
        properties.county,
        properties.state,
    ].filter((part) => {
        if (!part)
            return false;
        if (isWardCode(part))
            return false;
        return normalizeSuggestionName(part) !== normalizeSuggestionName(primary);
    });
    const displayName = [
        primary,
        ...Array.from(new Set(context)).slice(0, 2),
    ].join(", ");
    return displayName
        .replace(/mira[-\s]bhayander/gi, "Mira Bhayandar")
        .replace(/bhayander/gi, "Bhayandar");
};
const isPhotonResultInServiceArea = (item) => {
    const [lng, lat] = item.geometry.coordinates;
    return (Number.isFinite(lat) &&
        Number.isFinite(lng) &&
        (0, service_area_1.isWithinServiceAreaBounds)({ lat, lng }) &&
        (0, service_area_1.hasServiceAreaName)([
            item.properties.name,
            item.properties.street,
            item.properties.locality,
            item.properties.neighbourhood,
            item.properties.suburb,
            item.properties.municipality,
            item.properties.city,
            item.properties.district,
            item.properties.county,
            item.properties.state,
        ]));
};
const getPhotonSourceId = (item) => {
    const { osm_type: osmType, osm_id: osmId } = item.properties;
    if (osmType && osmId)
        return `photon:${osmType}:${osmId}`;
    const [lng, lat] = item.geometry.coordinates;
    const displayName = getPhotonDisplayName(item.properties);
    return `photon:${(0, place_search_1.normalizePlaceText)(displayName)}:${lat.toFixed(5)}:${lng.toFixed(5)}`;
};
const getPhotonAliases = (item) => Array.from(new Set([
    item.properties.name,
    item.properties.street,
    item.properties.locality,
    item.properties.neighbourhood,
    item.properties.suburb,
    item.properties.municipality,
].filter((part) => Boolean(part?.trim()))));
const getPhotonAddressParts = (item) => Array.from(new Set([
    item.properties.locality,
    item.properties.neighbourhood,
    item.properties.suburb,
    item.properties.municipality,
    item.properties.city,
    item.properties.district,
    item.properties.county,
    item.properties.state,
].filter((part) => Boolean(part?.trim()))));
const fetchPhotonSuggestions = async (query) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PHOTON_TIMEOUT_MS);
    try {
        const photonParams = new URLSearchParams({
            q: query,
            limit: String(PHOTON_RESULT_LIMIT),
            lang: "en",
            bbox: [
                service_area_1.SERVICE_AREA_BOUNDS.west,
                service_area_1.SERVICE_AREA_BOUNDS.south,
                service_area_1.SERVICE_AREA_BOUNDS.east,
                service_area_1.SERVICE_AREA_BOUNDS.north,
            ].join(","),
        });
        const response = await fetch(`https://photon.komoot.io/api?${photonParams.toString()}`, {
            headers: {
                "User-Agent": "Medio/1.0 (location-search)"
            },
            signal: controller.signal
        });
        if (!response.ok) {
            return getLocalFuzzySuggestions(query);
        }
        const data = (await response.json());
        const photonSuggestions = (data.features ?? [])
            .filter(isPhotonResultInServiceArea)
            .map((item) => ({
            name: getPhotonDisplayName(item.properties),
            lat: item.geometry.coordinates[1],
            lng: item.geometry.coordinates[0],
            source: "photon",
            sourceId: getPhotonSourceId(item),
            aliases: getPhotonAliases(item),
            addressParts: getPhotonAddressParts(item),
        }))
            .filter((item) => item.name !== "Unnamed location" &&
            Number.isFinite(item.lat) &&
            Number.isFinite(item.lng));
        await upsertCachedPlaces(photonSuggestions);
        const suggestions = [
            ...getPopularSuggestionsForQuery(query),
            ...getCuratedSuggestions(query),
            ...photonSuggestions
        ];
        const strongResults = filterSuggestionsForQuery(suggestions, query);
        if (strongResults.length > 0) {
            return rankSuggestionsByPopularity(strongResults);
        }
        const allCandidates = [
            ...curatedLocations,
            ...Array.from(popularityCache.values()).map((e) => e.suggestion),
            ...photonSuggestions
        ];
        const fuzzyCandidates = dedupeLocationSuggestions(allCandidates, DB_PLACE_CANDIDATE_LIMIT)
            .map((candidate) => {
            const keywords = candidate.keywords || [];
            return {
                candidate,
                score: (0, fuzzy_1.getFuzzyScore)(query, candidate.name, keywords),
                isMatch: (0, fuzzy_1.isFuzzyMatch)(query, candidate.name, keywords)
            };
        })
            .filter((item) => item.isMatch)
            .sort((a, b) => b.score - a.score)
            .map((item) => item.candidate);
        return rankSuggestionsByPopularity(fuzzyCandidates);
    }
    catch (error) {
        logger_1.logger.warn("Photon search unavailable; using local location suggestions", { error });
        return getLocalFuzzySuggestions(query);
    }
    finally {
        clearTimeout(timeout);
    }
};
router.post("/select", security_middleware_1.searchRateLimiter, async (req, res) => {
    const { name, lat, lng } = req.body ?? {};
    const suggestion = {
        name: typeof name === "string" ? name : "",
        lat: Number(lat),
        lng: Number(lng),
    };
    const accepted = recordLocationSelection(suggestion);
    if (accepted) {
        recordCachedPlaceSelection(suggestion).catch((error) => {
            logger_1.logger.warn("Failed to record cached place selection", { error });
        });
    }
    res.status(accepted ? 204 : 400).end();
});
router.get("/", security_middleware_1.searchRateLimiter, (0, validation_middleware_1.validateQuery)(api_validator_1.searchQuerySchema), async (req, res) => {
    const query = req.query.q;
    const cacheKey = getSearchCacheKey(query);
    try {
        const cachedPlaceMatches = await searchCachedPlaces(query);
        const confidentCacheMatches = cachedPlaceMatches.filter(({ score }) => (0, place_search_1.isConfidentPlaceScore)(score));
        if (confidentCacheMatches.length >= MIN_CONFIDENT_CACHE_RESULTS ||
            (confidentCacheMatches[0]?.score ?? 0) >= STRONG_SINGLE_CACHE_SCORE) {
            const results = rankConfidenceResults(confidentCacheMatches);
            setCachedSearch(cacheKey, results);
            res.setHeader("X-Medio-Place-Cache", "hit");
            res.json(results);
            return;
        }
        const cached = getCachedSearch(cacheKey);
        if (cached) {
            const cachedResults = scoreSuggestionsForQuery([
                ...getPopularSuggestionsForQuery(query),
                ...cached.results,
            ], query);
            const combinedCachedResults = rankConfidenceResults([
                ...confidentCacheMatches,
                ...cachedResults,
            ]);
            if (combinedCachedResults.length > 0) {
                res.setHeader("X-Medio-Cache", "hit");
                res.json(combinedCachedResults);
                return;
            }
        }
        const pending = pendingSearches.get(cacheKey) ?? fetchPhotonSuggestions(query);
        if (!pendingSearches.has(cacheKey)) {
            pendingSearches.set(cacheKey, pending);
        }
        const photonResults = await pending;
        const postPhotonCachedMatches = await searchCachedPlaces(query);
        const results = rankConfidenceResults([
            ...postPhotonCachedMatches,
            ...scoreSuggestionsForQuery([
                ...getPopularSuggestionsForQuery(query),
                ...getCuratedSuggestions(query),
                ...photonResults,
                ...getLocalFuzzySuggestions(query),
            ], query),
        ]);
        if (results.length > 0) {
            setCachedSearch(cacheKey, results);
        }
        res.json(results);
    }
    catch (error) {
        logger_1.logger.error("Photon search failed", { error });
        res.json(getLocalFuzzySuggestions(query));
    }
    finally {
        pendingSearches.delete(cacheKey);
    }
});
exports.default = router;
//# sourceMappingURL=search.routes.js.map