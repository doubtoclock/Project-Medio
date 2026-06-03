import { getBackendUrl } from "./backend";

export interface LocationResult {
  name: string;
  lat: number;
  lng: number;
}

const normalizeLocationName = (name: string) =>
  name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

export const dedupeLocationSuggestions = (
  suggestions: unknown,
  limit = 5
): LocationResult[] => {
  if (!Array.isArray(suggestions)) return [];

  const seen = new Set<string>();
  const unique: LocationResult[] = [];

  for (const item of suggestions) {
    if (!item || typeof item !== "object") continue;

    const candidate = item as Partial<LocationResult>;
    const name = typeof candidate.name === "string" ? candidate.name.trim() : "";
    const lat = Number(candidate.lat);
    const lng = Number(candidate.lng);
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

export const fetchLocationSuggestions = async (
  query: string,
  signal?: AbortSignal
) => {
  const trimmedQuery = query.trim();
  if (trimmedQuery.length < 3) return [];

  try {
    const res = await fetch(
      `${getBackendUrl()}/api/search?q=${encodeURIComponent(trimmedQuery)}`,
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
