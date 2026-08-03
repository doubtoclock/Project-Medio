import axios from "axios";
import * as turf from "@turf/turf";
import { Feature, Geometry } from "geojson";
import { logger } from "../utils/logger";
import { isWithinServiceAreaBounds } from "../utils/service-area";

export type OverpassPOI = {
  type?: "node" | "way" | "relation";
  id: number;
  lat: number;
  lon: number;
  tags?: Record<string, string>;
};

type RawOverpassElement = {
  type?: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: {
    lat?: number;
    lon?: number;
  };
  tags?: Record<string, string>;
};

type POISearchPoint = {
  lat: number;
  lon: number;
};

type VenueCategoryStage = "primary" | "secondary" | "all";

type PoiCacheEntry = {
  pois: OverpassPOI[];
  expiresAt: number;
};

export class POILookupUnavailableError extends Error {
  constructor(failures: string[]) {
    super(`Live POI lookup unavailable: ${failures.join("; ")}`);
    this.name = "POILookupUnavailableError";
  }
}

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.openstreetmap.ru/api/interpreter"
];
const OVERPASS_ENDPOINT_COOLDOWN_MS = 2 * 60 * 1000;
const POI_CACHE_TTL_MS = 45 * 60 * 1000;
const POI_CACHE_LIMIT = 120;
const poiCache = new Map<string, PoiCacheEntry>();
const overpassEndpointCooldowns = new Map<string, number>();

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const dedupePOIs = (pois: OverpassPOI[]) => {
  const seen = new Set<string>();

  return pois.filter((poi) => {
    const key = `${poi.type || "node"}:${poi.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const hasUsableName = (poi: OverpassPOI) => {
  const name = poi.tags?.name?.trim();
  return Boolean(name && name.length > 1);
};

const CATEGORY_TAG_VALUES: Record<string, Set<string>> = {
  amenity: new Set([
    "cafe",
    "restaurant",
    "food_court",
    "fast_food",
    "bar",
    "pub",
    "ice_cream",
    "library",
    "cinema",
    "theatre",
    "arts_centre",
    "community_centre",
    "marketplace"
  ]),
  leisure: new Set([
    "park",
    "garden",
    "bowling_alley",
    "sports_centre",
    "fitness_centre"
  ]),
  tourism: new Set([
    "museum",
    "attraction",
    "gallery",
    "hotel"
  ]),
  shop: new Set([
    "mall",
    "department_store",
    "books"
  ]),
  natural: new Set(["beach"])
};

const hasCategoryTag = (tags: Record<string, string> = {}) =>
  Object.entries(CATEGORY_TAG_VALUES).some(([key, values]) => {
    const value = tags[key];
    return typeof value === "string" && values.has(value);
  });

export const isValidCategoryPOI = (poi: OverpassPOI) => {
  const tags = poi.tags ?? {};

  if (!hasUsableName(poi)) return false;
  if (!hasCategoryTag(tags)) return false;
  if (tags.place || tags.boundary || tags.admin_level) return false;

  return true;
};

const roundCoord = (value: number) => value.toFixed(3);

const getPoiCacheKey = (
  points: POISearchPoint[],
  radiusKm: number,
  stage: VenueCategoryStage
) => [
  stage,
  radiusKm.toFixed(1),
  ...points.map((point) => `${roundCoord(point.lat)},${roundCoord(point.lon)}`)
].join(":");

const getCachedPois = (key: string) => {
  const cached = poiCache.get(key);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    poiCache.delete(key);
    return null;
  }
  return cached.pois;
};

const setCachedPois = (key: string, pois: OverpassPOI[]) => {
  poiCache.set(key, {
    pois,
    expiresAt: Date.now() + POI_CACHE_TTL_MS
  });

  if (poiCache.size <= POI_CACHE_LIMIT) return;
  const firstKey = poiCache.keys().next().value;
  if (firstKey) poiCache.delete(firstKey);
};

const getAvailableOverpassEndpoints = () => {
  const now = Date.now();
  const available = OVERPASS_ENDPOINTS.filter((endpoint) =>
    (overpassEndpointCooldowns.get(endpoint) ?? 0) <= now
  );
  return available.length > 0 ? available : OVERPASS_ENDPOINTS;
};

const coolDownEndpoint = (endpoint: string) => {
  overpassEndpointCooldowns.set(
    endpoint,
    Date.now() + OVERPASS_ENDPOINT_COOLDOWN_MS
  );
};

const normalizeOverpassElement = (
  element: RawOverpassElement
): OverpassPOI | null => {
  const lat = element.lat ?? element.center?.lat;
  const lon = element.lon ?? element.center?.lon;

  if (
    typeof lat !== "number" ||
    typeof lon !== "number" ||
    Number.isNaN(lat) ||
    Number.isNaN(lon)
  ) {
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

const normalizeOverpassElements = (elements: RawOverpassElement[]) =>
  elements
    .map(normalizeOverpassElement)
    .filter((poi): poi is OverpassPOI => Boolean(poi));

const postOverpassQuery = async (
  endpoint: string,
  query: string,
  timeoutMs: number
) => {
  const startedAt = Date.now();
  const response = await axios.post(endpoint, new URLSearchParams({
    data: query
  }).toString(), {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "Medio/1.0 (meeting-place-search)"
    },
    maxRedirects: 0,
    timeout: timeoutMs
  });

  const durationMs = Date.now() - startedAt;
  if (!response.data || !response.data.elements) {
    logger.warn("Overpass response missing elements", {
      endpoint,
      durationMs
    });
    return [];
  }

  const pois = normalizeOverpassElements(response.data.elements);
  logger.info("Overpass endpoint returned POIs", {
    endpoint,
    durationMs,
    rawElementCount: response.data.elements.length,
    normalizedPoiCount: pois.length,
    namedPoiCount: pois.filter(hasUsableName).length
  });

  return pois;
};

const fetchFirstOverpassResponse = async (
  query: string,
  timeoutMs: number
) => {
  const endpoints = getAvailableOverpassEndpoints();
  const attempts = await Promise.allSettled(
    endpoints.map(async (endpoint) => ({
      endpoint,
      pois: await postOverpassQuery(endpoint, query, timeoutMs)
    }))
  );

  const failures: string[] = [];

  for (const attempt of attempts) {
    if (attempt.status === "fulfilled") {
      return { pois: attempt.value.pois, failures };
    }

    const index = attempts.indexOf(attempt);
    const endpoint = endpoints[index];
    const err: any = attempt.reason;
    const status = err?.response?.status;
    const message = status ? `status ${status}` : err.message;
    coolDownEndpoint(endpoint);
    failures.push(`${endpoint} (${message})`);
  }

  return { pois: [], failures };
};

const buildAroundQuery = (
  points: POISearchPoint[],
  radiusKm: number,
  limit: number,
  stage: VenueCategoryStage
) => {
  const radiusMeters = Math.round(clamp(radiusKm, 0.5, 50) * 1000);
  const primaryFilters = [
    `["amenity"~"cafe|restaurant|food_court|fast_food|bar|pub"]`,
    `["shop"~"mall"]`
  ];
  const secondaryFilters = [
    `["amenity"~"ice_cream|library|cinema|theatre|arts_centre|community_centre|marketplace"]`,
    `["leisure"~"park|garden|bowling_alley|sports_centre|fitness_centre"]`,
    `["tourism"~"museum|attraction|gallery|hotel"]`,
    `["shop"~"department_store|books"]`,
    `["natural"="beach"]`
  ];
  const venueFilters = stage === "primary"
    ? primaryFilters
    : stage === "secondary"
      ? secondaryFilters
      : [...primaryFilters, ...secondaryFilters];
  const pointLimit = radiusKm > 7 ? 3 : 5;
  const outputLimit = Math.max(limit, Math.min(limit * 3, 260));
  const blocks = points
    .slice(0, pointLimit)
    .flatMap((point) =>
      venueFilters.flatMap((filter) => [
        `node(around:${radiusMeters},${point.lat},${point.lon})${filter};`,
        `way(around:${radiusMeters},${point.lat},${point.lon})${filter};`
      ])
    )
    .join("\n");

  return `
  [out:json][timeout:8];
  (
    ${blocks}
  );
  out center ${outputLimit};
  `;
};

export async function fetchMeetingPOIsNearPoints(
  points: POISearchPoint[],
  radiusKm: number,
  limit = 80,
  timeoutMs = 4500,
  stage: VenueCategoryStage = "all"
): Promise<OverpassPOI[]> {
  if (points.length === 0) return [];

  const cacheKey = getPoiCacheKey(points, radiusKm, stage);
  const cached = getCachedPois(cacheKey);
  if (cached) {
    logger.info("POI cache hit", {
      radiusKm,
      stage,
      resultCount: cached.length,
      namedPoiCount: cached.filter(hasUsableName).length
    });
    return cached.slice(0, limit);
  }

  const query = buildAroundQuery(points, radiusKm, limit, stage);
  const { pois: responsePois, failures } = await fetchFirstOverpassResponse(
    query,
    timeoutMs
  );
  const pois = dedupePOIs(responsePois)
    .filter((poi) =>
      Number.isFinite(poi.lat) &&
      Number.isFinite(poi.lon) &&
      isWithinServiceAreaBounds({ lat: poi.lat, lon: poi.lon }) &&
      isValidCategoryPOI(poi)
    )
    .slice(0, limit);

  setCachedPois(cacheKey, pois);

  logger.info("Overpass POI search completed", {
    radiusKm,
    stage,
    returnedCount: responsePois.length,
    filteredCount: pois.length,
    namedPoiCount: pois.filter(hasUsableName).length,
    failureCount: failures.length
  });
  if (pois.length === 0 && failures.length > 0) {
    logger.warn("Live POI lookup unavailable at current radius", {
      failureCount: failures.length,
    });
  }

  if (pois.length === 0 && failures.length === OVERPASS_ENDPOINTS.length) {
    throw new POILookupUnavailableError(failures);
  }

  return pois;
}

export async function fetchMeetingPOIs(
  polygon: Feature<Geometry>
): Promise<OverpassPOI[]> {

  const bbox = turf.bbox(polygon);

  const south = bbox[1];
  const west = bbox[0];
  const north = bbox[3];
  const east = bbox[2];

  const query = `
  [out:json][timeout:25];

  (
    node["amenity"~"cafe|restaurant|fast_food|food_court|ice_cream|library|cinema|theatre|arts_centre|community_centre|marketplace|bar|pub"](${south},${west},${north},${east});
    way["amenity"~"cafe|restaurant|fast_food|food_court|ice_cream|library|cinema|theatre|arts_centre|community_centre|marketplace|bar|pub"](${south},${west},${north},${east});
    node["leisure"~"park|garden|bowling_alley|sports_centre|fitness_centre"](${south},${west},${north},${east});
    way["leisure"~"park|garden|bowling_alley|sports_centre|fitness_centre"](${south},${west},${north},${east});
    node["tourism"~"museum|attraction|gallery|hotel"](${south},${west},${north},${east});
    way["tourism"~"museum|attraction|gallery|hotel"](${south},${west},${north},${east});
    node["shop"~"mall|department_store|books"](${south},${west},${north},${east});
    way["shop"~"mall|department_store|books"](${south},${west},${north},${east});
    node["natural"="beach"](${south},${west},${north},${east});
    way["natural"="beach"](${south},${west},${north},${east});
  );

  out center;
  `;

  try {
    const { pois: responsePois, failures } = await fetchFirstOverpassResponse(
      query,
      12000
    );

    if (responsePois.length === 0 && failures.length > 0) {
      logger.warn("Overpass lookups failed", { failures });
    }

    const pois = dedupePOIs(responsePois);

    /* ==============================
       FILTER POIs INSIDE POLYGON
    =============================== */

    const filtered = pois.filter((p) => {

      if (!Number.isFinite(p.lat) || !Number.isFinite(p.lon)) return false;
      if (!isWithinServiceAreaBounds({ lat: p.lat, lon: p.lon })) return false;
      if (!isValidCategoryPOI(p)) return false;

      const point = turf.point([p.lon, p.lat]);

      return turf.booleanPointInPolygon(point, polygon as any);
    });

    logger.debug("Overpass polygon filtering completed", {
      returnedCount: pois.length,
      insidePolygonCount: filtered.length,
    });

    return filtered;

  } catch (err: any) {
    logger.warn("Overpass request failed", { error: err });

    return [];
  }
}
