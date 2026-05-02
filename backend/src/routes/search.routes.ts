import { Router } from "express";
import { searchRateLimiter } from "../middlewares/security.middleware";
import { validateQuery } from "../middlewares/validation.middleware";
import { logger } from "../utils/logger";
import { searchQuerySchema } from "../validators/api.validator";

const router = Router();

type LocationSuggestion = {
  name: string;
  lat: number;
  lng: number;
};

type SearchCacheEntry = {
  results: LocationSuggestion[];
  expiresAt: number;
  lastUsed: number;
  hits: number;
};

const PHOTON_TIMEOUT_MS = 1800;
const SEARCH_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const SEARCH_CACHE_LIMIT = 160;
const MIN_SIMILAR_QUERY_LENGTH = 5;

const searchCache = new Map<string, SearchCacheEntry>();
const pendingSearches = new Map<string, Promise<LocationSuggestion[]>>();

const tokenAliases: Record<string, string> = {
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

const getQueryTokens = (query: string) =>
  query
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .map((token) => tokenAliases[token] ?? token)
    .filter((token) => token.length > 1);

const getSearchCacheKey = (query: string) =>
  getQueryTokens(query).sort().join(" ");

const getBigrams = (value: string) => {
  const compact = value.replace(/\s+/g, "");
  if (compact.length < 2) return [compact];

  const bigrams: string[] = [];
  for (let index = 0; index < compact.length - 1; index += 1) {
    bigrams.push(compact.slice(index, index + 2));
  }

  return bigrams;
};

const getDiceSimilarity = (left: string, right: string) => {
  if (left === right) return 1;
  if (!left || !right) return 0;

  const rightCounts = new Map<string, number>();
  getBigrams(right).forEach((bigram) => {
    rightCounts.set(bigram, (rightCounts.get(bigram) ?? 0) + 1);
  });

  let overlap = 0;
  getBigrams(left).forEach((bigram) => {
    const count = rightCounts.get(bigram) ?? 0;
    if (count === 0) return;
    overlap += 1;
    rightCounts.set(bigram, count - 1);
  });

  return (2 * overlap) / (getBigrams(left).length + getBigrams(right).length);
};

const areSimilarQueries = (left: string, right: string) => {
  if (left === right) return true;
  if (
    left.length < MIN_SIMILAR_QUERY_LENGTH ||
    right.length < MIN_SIMILAR_QUERY_LENGTH
  ) {
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

  if (searchCache.size <= SEARCH_CACHE_LIMIT) return;

  const entries = [...searchCache.entries()].sort(
    (left, right) =>
      left[1].lastUsed + left[1].hits * 1000 -
      (right[1].lastUsed + right[1].hits * 1000)
  );
  const removeCount = searchCache.size - SEARCH_CACHE_LIMIT;

  entries.slice(0, removeCount).forEach(([key]) => searchCache.delete(key));
};

const getCachedSearch = (key: string) => {
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

    if (!areSimilarQueries(key, cachedKey)) continue;

    entry.lastUsed = now;
    entry.hits += 1;
    return entry;
  }

  return null;
};

const setCachedSearch = (key: string, results: LocationSuggestion[]) => {
  searchCache.set(key, {
    results,
    expiresAt: Date.now() + SEARCH_CACHE_TTL_MS,
    lastUsed: Date.now(),
    hits: 0
  });
  pruneSearchCache();
};

const fetchPhotonSuggestions = async (
  query: string
): Promise<LocationSuggestion[]> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PHOTON_TIMEOUT_MS);

  try {
    const response = await fetch(
      `https://photon.komoot.io/api?q=${encodeURIComponent(query)}&limit=5&lat=19.076&lon=72.8777`,
      {
        headers: {
          "User-Agent": "Medio/1.0 (location-search)"
        },
        signal: controller.signal
      }
    );

    if (!response.ok) return [];

    const data = (await response.json()) as {
      features?: {
        properties: { name?: string; street?: string; city?: string };
        geometry: { coordinates: [number, number] };
      }[];
    };

    return (data.features ?? [])
      .map((item) => ({
        name:
          item.properties.name ||
          item.properties.street ||
          item.properties.city ||
          "Unnamed location",
        lat: item.geometry.coordinates[1],
        lng: item.geometry.coordinates[0]
      }))
      .filter(
        (item) =>
          item.name !== "Unnamed location" &&
          Number.isFinite(item.lat) &&
          Number.isFinite(item.lng)
      );
  } finally {
    clearTimeout(timeout);
  }
};

router.get("/", searchRateLimiter, validateQuery(searchQuerySchema), async (req, res) => {
  const query = req.query.q as string;

  const cacheKey = getSearchCacheKey(query);

  const cached = getCachedSearch(cacheKey);
  if (cached) {
    res.setHeader("X-Medio-Cache", "hit");
    res.json(cached.results);
    return;
  }

  try {
    const pending =
      pendingSearches.get(cacheKey) ?? fetchPhotonSuggestions(query);

    if (!pendingSearches.has(cacheKey)) {
      pendingSearches.set(cacheKey, pending);
    }

    const results = await pending;
    if (results.length > 0) {
      setCachedSearch(cacheKey, results);
    }

    res.json(results);
  } catch (error) {
    logger.error("Photon search failed", { error });
    res.status(500).json([]);
  } finally {
    pendingSearches.delete(cacheKey);
  }
});

export default router;
