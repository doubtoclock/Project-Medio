import { apiFetch } from "./api";

const normalizeLocationName = (name) =>
  name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

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

export const fetchLocationSuggestions = async (query, signal) => {
  const trimmedQuery = query.trim();
  if (trimmedQuery.length < 3) return [];

  try {
    const res = await apiFetch(
      `/api/search?q=${encodeURIComponent(trimmedQuery)}`,
      { signal }
    );
    if (!res.ok) return [];

    return dedupeLocationSuggestions(await res.json());
  } catch (error) {
    if (signal?.aborted) {
      throw error;
    }

    return [];
  }
};
