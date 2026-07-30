import { apiFetch } from "./api";

const SUGGESTION_CACHE_KEY = "medio_location_suggestion_cache_v2";
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

export const dedupeLocationSuggestions = (suggestions, limit = 5) => {
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
  const entry = cache[key];

  if (!entry || entry.expiresAt <= Date.now()) {
    if (entry) {
      delete cache[key];
      writeJsonStorage(SUGGESTION_CACHE_KEY, cache);
    }
    return null;
  }

  entry.lastUsed = Date.now();
  entry.hits = (entry.hits || 0) + 1;
  cache[key] = entry;
  writeJsonStorage(SUGGESTION_CACHE_KEY, cache);
  return entry;
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
    .slice(0, 5);
};

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

export const fetchLocationSuggestions = async (query, signal) => {
  const trimmedQuery = query.trim();
  if (trimmedQuery.length < 3) return [];

  const cached = getCachedSuggestionEntry(trimmedQuery);
  if (cached) return rankByLocalPopularity(cached.results);

  try {
    const res = await apiFetch(
      `/api/search?q=${encodeURIComponent(trimmedQuery)}`,
      { signal }
    );
    if (!res.ok) return [];

    const suggestions = rankByLocalPopularity(await res.json());
    cacheSuggestions(trimmedQuery, suggestions);
    return suggestions;
  } catch (error) {
    if (signal?.aborted) {
      throw error;
    }

    return [];
  }
};
