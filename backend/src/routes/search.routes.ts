import { Router } from "express";
import { searchRateLimiter } from "../middlewares/security.middleware";
import { validateQuery } from "../middlewares/validation.middleware";
import { logger } from "../utils/logger";
import {
  SERVICE_AREA_BOUNDS,
  hasServiceAreaName,
  isWithinServiceAreaBounds,
} from "../utils/service-area";
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
const POPULARITY_CACHE_LIMIT = 500;
const MIN_SIMILAR_QUERY_LENGTH = 5;
const MAX_SEARCH_RESULTS = 8;
const PHOTON_RESULT_LIMIT = 16;

const searchCache = new Map<string, SearchCacheEntry>();
const pendingSearches = new Map<string, Promise<LocationSuggestion[]>>();
const popularityCache = new Map<string, {
  suggestion: LocationSuggestion;
  count: number;
  lastSelected: number;
}>();

const curatedLocations: Array<LocationSuggestion & { keywords: string[] }> = [
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
    .filter((token) => token.length > 0);

const getSearchCacheKey = (query: string) =>
  getQueryTokens(query).sort().join(" ");

const normalizeSuggestionName = (name: string) =>
  name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

const getPrimarySuggestionName = (name: string) => name.split(",")[0];

const matchesQueryPrefix = (suggestion: LocationSuggestion, query: string) => {
  const normalizedQuery = normalizeSuggestionName(query);
  if (!normalizedQuery) return false;

  const normalizedName = normalizeSuggestionName(suggestion.name);
  if (!normalizedName) return false;

  if (
    normalizeSuggestionName(getPrimarySuggestionName(suggestion.name)).startsWith(normalizedQuery)
  ) {
    return true;
  }

  if (normalizedName.includes(normalizedQuery)) return true;

  const queryTokens = normalizedQuery.split(" ").filter(Boolean);
  return (
    queryTokens.length > 1 &&
    queryTokens.every((token) => normalizedName.includes(token))
  );
};

const filterSuggestionsForQuery = (suggestions: LocationSuggestion[], query: string) =>
  suggestions.filter((suggestion) => matchesQueryPrefix(suggestion, query));

const dedupeLocationSuggestions = (suggestions: LocationSuggestion[]) => {
  const seen = new Set<string>();
  const unique: LocationSuggestion[] = [];

  for (const suggestion of suggestions) {
    const name = suggestion.name.trim();
    const key = normalizeSuggestionName(name);

    if (
      !key ||
      seen.has(key) ||
      !Number.isFinite(suggestion.lat) ||
      !Number.isFinite(suggestion.lng) ||
      !isWithinServiceAreaBounds(suggestion)
    ) {
      continue;
    }

    seen.add(key);
    unique.push({
      name,
      lat: suggestion.lat,
      lng: suggestion.lng
    });

    if (unique.length >= MAX_SEARCH_RESULTS) break;
  }

  return unique;
};

const getPopularityKey = (suggestion: LocationSuggestion) =>
  `${normalizeSuggestionName(suggestion.name)}:${suggestion.lat.toFixed(4)},${suggestion.lng.toFixed(4)}`;

const getPopularityScore = (suggestion: LocationSuggestion) => {
  const entry = popularityCache.get(getPopularityKey(suggestion));
  if (!entry) return 0;

  const daysSinceSelected = (Date.now() - entry.lastSelected) / (24 * 60 * 60 * 1000);
  return entry.count * 4 + Math.max(0, 7 - daysSinceSelected);
};

const rankSuggestionsByPopularity = (suggestions: LocationSuggestion[]) =>
  dedupeLocationSuggestions(suggestions)
    .map((suggestion, index) => ({
      suggestion,
      score: getPopularityScore(suggestion),
      index
    }))
    .sort((left, right) =>
      right.score - left.score ||
      left.index - right.index
    )
    .map(({ suggestion }) => suggestion)
    .slice(0, MAX_SEARCH_RESULTS);

const getPopularSuggestionsForQuery = (query: string) => {
  const normalizedQuery = normalizeSuggestionName(query);
  if (!normalizedQuery) return [];

  return [...popularityCache.values()]
    .filter(({ suggestion }) =>
      matchesQueryPrefix(suggestion, normalizedQuery)
    )
    .sort((left, right) =>
      right.count - left.count ||
      right.lastSelected - left.lastSelected
    )
    .map(({ suggestion }) => suggestion)
    .slice(0, MAX_SEARCH_RESULTS);
};

const prunePopularityCache = () => {
  if (popularityCache.size <= POPULARITY_CACHE_LIMIT) return;

  const removeCount = popularityCache.size - POPULARITY_CACHE_LIMIT;
  [...popularityCache.entries()]
    .sort((left, right) =>
      left[1].count - right[1].count ||
      left[1].lastSelected - right[1].lastSelected
    )
    .slice(0, removeCount)
    .forEach(([key]) => popularityCache.delete(key));
};

const recordLocationSelection = (suggestion: LocationSuggestion) => {
  const [normalized] = dedupeLocationSuggestions([suggestion]);
  if (!normalized) return false;

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
  const normalizedResults = rankSuggestionsByPopularity(results);

  searchCache.set(key, {
    results: normalizedResults,
    expiresAt: Date.now() + SEARCH_CACHE_TTL_MS,
    lastUsed: Date.now(),
    hits: 0
  });
  pruneSearchCache();
};

const getCuratedSuggestions = (query: string) => {
  const normalizedQuery = normalizeSuggestionName(query);
  if (!normalizedQuery) return [];

  return curatedLocations
    .map((location) => {
      const bestScore = Math.max(...location.keywords.map((keyword) => {
        const normalizedKeyword = normalizeSuggestionName(keyword);
        if (normalizedKeyword === normalizedQuery) return 4;
        if (normalizedKeyword.startsWith(`${normalizedQuery} `)) return 3;
        if (normalizedKeyword.startsWith(normalizedQuery)) return 2;
        return 0;
      }));

      return { location, bestScore };
    })
    .filter(({ bestScore }) => bestScore > 0)
    .sort((left, right) => right.bestScore - left.bestScore)
    .map(({ location }) => location)
    .map(({ keywords, ...location }) => location);
};

const isWardCode = (part: string) => /^[\p{L}\p{N}/-]+\s+ward$/iu.test(part.trim());

const getPhotonDisplayName = (properties: {
  name?: string;
  street?: string;
  locality?: string;
  neighbourhood?: string;
  suburb?: string;
  municipality?: string;
  city?: string;
  district?: string;
  county?: string;
  state?: string;
}) => {
  const primary = properties.name || properties.street || properties.city;
  if (!primary) return "Unnamed location";

  const context = [
    properties.locality,
    properties.neighbourhood,
    properties.suburb,
    properties.municipality,
    properties.district,
    properties.city,
    properties.county,
    properties.state,
  ].filter((part): part is string => {
    if (!part) return false;
    if (isWardCode(part)) return false;
    return normalizeSuggestionName(part) !== normalizeSuggestionName(primary);
  });

  const displayName = [
    primary,
    ...Array.from(new Set(context)).slice(0, 2),
  ].join(", ");

  return displayName.replace(/mira[-\s]bhayander/gi, "Mira Bhayandar");
};

const isPhotonResultInServiceArea = (item: {
  properties: {
    name?: string;
    street?: string;
    locality?: string;
    neighbourhood?: string;
    suburb?: string;
    municipality?: string;
    city?: string;
    district?: string;
    county?: string;
    state?: string;
  };
  geometry: { coordinates: [number, number] };
}) => {
  const [lng, lat] = item.geometry.coordinates;
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    isWithinServiceAreaBounds({ lat, lng }) &&
    hasServiceAreaName([
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
    ])
  );
};

const fetchPhotonSuggestions = async (
  query: string
): Promise<LocationSuggestion[]> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PHOTON_TIMEOUT_MS);

  try {
    const photonParams = new URLSearchParams({
      q: query,
      limit: String(PHOTON_RESULT_LIMIT),
      lang: "en",
      bbox: [
        SERVICE_AREA_BOUNDS.west,
        SERVICE_AREA_BOUNDS.south,
        SERVICE_AREA_BOUNDS.east,
        SERVICE_AREA_BOUNDS.north,
      ].join(","),
    });
    const response = await fetch(
      `https://photon.komoot.io/api?${photonParams.toString()}`,
      {
        headers: {
          "User-Agent": "Medio/1.0 (location-search)"
        },
        signal: controller.signal
      }
    );

    if (!response.ok) {
      return dedupeLocationSuggestions(getCuratedSuggestions(query));
    }

    const data = (await response.json()) as {
      features?: {
        properties: {
          name?: string;
          street?: string;
          locality?: string;
          neighbourhood?: string;
          suburb?: string;
          municipality?: string;
          city?: string;
          district?: string;
          county?: string;
          state?: string;
        };
        geometry: { coordinates: [number, number] };
      }[];
    };

    const photonSuggestions = (data.features ?? [])
      .filter(isPhotonResultInServiceArea)
      .map((item) => ({
        name: getPhotonDisplayName(item.properties),
        lat: item.geometry.coordinates[1],
        lng: item.geometry.coordinates[0]
      }))
      .filter(
        (item) =>
          item.name !== "Unnamed location" &&
          Number.isFinite(item.lat) &&
          Number.isFinite(item.lng)
      );

    const suggestions = [
      ...getPopularSuggestionsForQuery(query),
      ...getCuratedSuggestions(query),
      ...photonSuggestions
    ];

    return rankSuggestionsByPopularity(filterSuggestionsForQuery(suggestions, query));
  } catch (error) {
    logger.warn("Photon search unavailable; using local location suggestions", { error });
    return rankSuggestionsByPopularity([
      ...getPopularSuggestionsForQuery(query),
      ...getCuratedSuggestions(query)
    ]);
  } finally {
    clearTimeout(timeout);
  }
};

router.post("/select", searchRateLimiter, async (req, res) => {
  const { name, lat, lng } = req.body ?? {};
  const accepted = recordLocationSelection({
    name: typeof name === "string" ? name : "",
    lat: Number(lat),
    lng: Number(lng),
  });

  res.status(accepted ? 204 : 400).end();
});

router.get("/", searchRateLimiter, validateQuery(searchQuerySchema), async (req, res) => {
  const query = req.query.q as string;

  const cacheKey = getSearchCacheKey(query);

  const cached = getCachedSearch(cacheKey);
  if (cached) {
    res.setHeader("X-Medio-Cache", "hit");
    res.json(rankSuggestionsByPopularity([
      ...getPopularSuggestionsForQuery(query),
      ...filterSuggestionsForQuery(cached.results, query)
    ]));
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
