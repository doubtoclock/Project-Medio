import { apiFetch } from "./api";

const SUGGESTION_CACHE_KEY = "medio_location_suggestion_cache_v3";
const POPULARITY_KEY = "medio_location_popularity_v1";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const CACHE_LIMIT = 80;
const POPULARITY_LIMIT = 120;

const normalizeLocationName = (name) =>
  name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

const getPrimaryLocationName = (name) => String(name || "").split(",")[0];

const matchesQueryPrefix = (suggestion, query) => {
  const normalizedQuery = normalizeLocationName(query);
  if (!normalizedQuery) return false;

  const normalizedName = normalizeLocationName(suggestion?.name || "");
  if (!normalizedName) return false;

  if (normalizeLocationName(getPrimaryLocationName(suggestion?.name)).startsWith(normalizedQuery)) {
    return true;
  }

  if (normalizedName.includes(normalizedQuery)) return true;

  const queryTokens = normalizedQuery.split(" ").filter(Boolean);
  return (
    queryTokens.length > 1 &&
    queryTokens.every((token) => normalizedName.includes(token))
  );
};

const getSuggestionKey = (suggestion) =>
  `${normalizeLocationName(suggestion.name)}:${Number(suggestion.lat).toFixed(4)},${Number(suggestion.lng).toFixed(4)}`;

const readJsonStorage = (key, fallback) => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
};

const writeJsonStorage = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {

  }
};

export const dedupeLocationSuggestions = (suggestions, limit = 8) => {
  if (!Array.isArray(suggestions)) return [];

  const seen = new Set();
  const unique = [];

  for (const item of suggestions) {
    if (!item || typeof item !== "object") continue;

    const name = typeof item.name === "string" ? item.name.trim() : "";
    const lat = Number(item.lat);
    const lng = Number(item.lng);
    const key = normalizeLocationName(name);

    if (!key || seen.has(key) || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      continue;
    }

    seen.add(key);
    unique.push({ name, lat, lng });

    if (unique.length >= limit) break;
  }

  return unique;
};

const getCachedSuggestionEntry = (query) => {
  const cache = readJsonStorage(SUGGESTION_CACHE_KEY, {});
  const key = normalizeLocationName(query);
  const now = Date.now();
  const entry = cache[key];

  if (entry && entry.expiresAt > now) {
    entry.lastUsed = now;
    entry.hits = (entry.hits || 0) + 1;
    cache[key] = entry;
    writeJsonStorage(SUGGESTION_CACHE_KEY, cache);
    return { ...entry, isExact: true };
  }

  if (entry) {
    delete cache[key];
  }

  const prefixKeys = Object.keys(cache)
    .filter((cachedKey) => cachedKey && cachedKey !== key && key.startsWith(cachedKey))
    .sort((left, right) => right.length - left.length);

  for (const cachedKey of prefixKeys) {
    const candidate = cache[cachedKey];
    if (!candidate || candidate.expiresAt <= now) continue;

    candidate.lastUsed = now;
    candidate.hits = (candidate.hits || 0) + 1;
    cache[cachedKey] = candidate;
    writeJsonStorage(SUGGESTION_CACHE_KEY, cache);
    return { ...candidate, isExact: false };
  }

  return null;
};

const cacheSuggestions = (query, suggestions) => {
  const cache = readJsonStorage(SUGGESTION_CACHE_KEY, {});
  const key = normalizeLocationName(query);
  const entries = Object.entries({
    ...cache,
    [key]: {
      results: suggestions,
      expiresAt: Date.now() + CACHE_TTL_MS,
      lastUsed: Date.now(),
      hits: 0,
    },
  })
    .filter(([, entry]) => entry.expiresAt > Date.now())
    .sort((left, right) =>
      (right[1].lastUsed + (right[1].hits || 0) * 1000) -
      (left[1].lastUsed + (left[1].hits || 0) * 1000)
    )
    .slice(0, CACHE_LIMIT);

  writeJsonStorage(SUGGESTION_CACHE_KEY, Object.fromEntries(entries));
};

const getPopularity = () => readJsonStorage(POPULARITY_KEY, {});

const rankByLocalPopularity = (suggestions) => {
  const popularity = getPopularity();

  return dedupeLocationSuggestions(suggestions, 20)
    .map((suggestion, index) => {
      const item = popularity[getSuggestionKey(suggestion)];
      const daysSinceSelected = item
        ? (Date.now() - item.lastSelected) / (24 * 60 * 60 * 1000)
        : 99;
      return {
        suggestion,
        index,
        score: item ? item.count * 4 + Math.max(0, 7 - daysSinceSelected) : 0,
      };
    })
    .sort((left, right) =>
      right.score - left.score ||
      left.index - right.index
    )
    .map(({ suggestion }) => suggestion)
    .slice(0, 8);
};

const filterSuggestionsForQuery = (suggestions, query) =>
  rankByLocalPopularity(suggestions.filter((suggestion) => matchesQueryPrefix(suggestion, query)));

export const recordLocationSelection = (location) => {
  const [suggestion] = dedupeLocationSuggestions([location], 1);
  if (!suggestion) return;

  const popularity = getPopularity();
  const key = getSuggestionKey(suggestion);
  const current = popularity[key] || { count: 0 };
  popularity[key] = {
    suggestion,
    count: current.count + 1,
    lastSelected: Date.now(),
  };

  const limited = Object.entries(popularity)
    .sort((left, right) =>
      right[1].count - left[1].count ||
      right[1].lastSelected - left[1].lastSelected
    )
    .slice(0, POPULARITY_LIMIT);
  writeJsonStorage(POPULARITY_KEY, Object.fromEntries(limited));

  apiFetch("/api/search/select", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(suggestion),
  }).catch(() => {});
};

const fetchFreshLocationSuggestions = async (trimmedQuery, signal, callbacks = {}) => {
  callbacks.onNetworkStart?.();
  try {
    const res = await apiFetch(
      `/api/search?q=${encodeURIComponent(trimmedQuery)}`,
      { signal }
    );
    if (!res.ok) return [];

    const freshResults = await res.json();
    cacheSuggestions(trimmedQuery, freshResults);
    return freshResults;
  } finally {
    callbacks.onNetworkEnd?.();
  }
};

export const fetchLocationSuggestions = async (
  query,
  signal,
  onBackgroundResults,
  callbacks = {}
) => {
  const trimmedQuery = query.trim();
  if (trimmedQuery.length < 1) return [];

  const cached = getCachedSuggestionEntry(trimmedQuery);
  if (cached) {
    const filtered = filterSuggestionsForQuery(cached.results, trimmedQuery);
    if (filtered.length > 0) {
      if (!cached.isExact) {
        fetchFreshLocationSuggestions(trimmedQuery, signal)
          .then((fresh) => {
            if (fresh.length > 0) onBackgroundResults?.(fresh);
          })
          .catch(() => {});
      }
      return filtered;
    }
  }

  try {
    return await fetchFreshLocationSuggestions(trimmedQuery, signal, callbacks);
  } catch (error) {
    if (signal?.aborted) {
      throw error;
    }

    return [];
  }
};
