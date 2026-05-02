import axios from "axios";
import * as turf from "@turf/turf";
import { Feature, Geometry } from "geojson";

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

type RawPhotonFeature = {
  properties?: {
    osm_type?: "N" | "W" | "R";
    osm_id?: number;
    osm_key?: string;
    osm_value?: string;
    name?: string;
    countrycode?: string;
  };
  geometry?: {
    coordinates?: [number, number];
  };
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
const PHOTON_ENDPOINT = "https://photon.komoot.io/api";
const PHOTON_MEETING_QUERIES = [
  "cafe",
  "coffee",
  "food",
  "restaurant",
  "mall",
  "park"
];
const GENERIC_PHOTON_NAMES = new Set([
  "cafe",
  "coffee",
  "food",
  "mall",
  "park",
  "restaurant"
]);
const PHOTON_ALLOWED_VALUES: Record<string, Set<string>> = {
  amenity: new Set([
    "bar",
    "cafe",
    "cinema",
    "community_centre",
    "fast_food",
    "food_court",
    "ice_cream",
    "library",
    "marketplace",
    "pub",
    "restaurant",
    "theatre"
  ]),
  leisure: new Set([
    "bowling_alley",
    "fitness_centre",
    "garden",
    "park",
    "sports_centre"
  ]),
  natural: new Set(["beach"]),
  shop: new Set(["books", "department_store", "mall"]),
  tourism: new Set(["attraction", "gallery", "hotel", "museum"])
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const toPoint = (point: POISearchPoint) => turf.point([point.lon, point.lat]);

const getDistanceKm = (from: POISearchPoint, to: POISearchPoint) =>
  turf.distance(toPoint(from), toPoint(to), { units: "kilometers" });

const dedupePOIs = (pois: OverpassPOI[]) => {
  const seen = new Set<string>();

  return pois.filter((poi) => {
    const key = `${poi.type || "node"}:${poi.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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

const normalizePhotonFeature = (
  feature: RawPhotonFeature
): OverpassPOI | null => {
  const properties = feature.properties;
  const coordinates = feature.geometry?.coordinates;
  const lon = coordinates?.[0];
  const lat = coordinates?.[1];
  const name = properties?.name?.trim();
  const osmId = properties?.osm_id;
  const osmKey = properties?.osm_key;
  const osmValue = properties?.osm_value;
  const allowedValues = osmKey ? PHOTON_ALLOWED_VALUES[osmKey] : undefined;

  if (
    typeof lat !== "number" ||
    typeof lon !== "number" ||
    typeof osmId !== "number" ||
    !osmKey ||
    !osmValue ||
    !allowedValues?.has(osmValue) ||
    !name ||
    GENERIC_PHOTON_NAMES.has(name.toLowerCase()) ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lon)
  ) {
    return null;
  }

  const osmType =
    properties?.osm_type === "W"
      ? "way"
      : properties?.osm_type === "R"
        ? "relation"
        : "node";
  const tags: Record<string, string> = { name };

  tags[osmKey] = osmValue;

  return {
    type: osmType,
    id: osmId,
    lat,
    lon,
    tags
  };
};

const fetchPhotonQuery = async (
  query: string,
  point: POISearchPoint,
  timeoutMs: number
) => {
  const response = await axios.get(PHOTON_ENDPOINT, {
    params: {
      q: query,
      limit: 12,
      lat: point.lat,
      lon: point.lon
    },
    headers: {
      "User-Agent": "Medio/1.0 (meeting-place-search)"
    },
    timeout: timeoutMs
  });

  const features = response.data?.features;

  if (!Array.isArray(features)) {
    return [];
  }

  return features
    .map(normalizePhotonFeature)
    .filter((poi): poi is OverpassPOI => Boolean(poi));
};

const postOverpassQuery = async (
  endpoint: string,
  query: string,
  timeoutMs: number
) => {
  const response = await axios.post(endpoint, new URLSearchParams({
    data: query
  }).toString(), {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "Medio/1.0 (meeting-place-search)"
    },
    timeout: timeoutMs
  });

  if (!response.data || !response.data.elements) {
    return [];
  }

  return normalizeOverpassElements(response.data.elements);
};

const fetchFirstOverpassResponse = async (
  query: string,
  timeoutMs: number
) => {
  const failures: string[] = [];

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const pois = await postOverpassQuery(endpoint, query, timeoutMs);
      return { pois, failures };
    } catch (err: any) {
      const status = err?.response?.status;
      const message = status ? `status ${status}` : err.message;
      failures.push(`${endpoint} (${message})`);
    }
  }

  return { pois: [], failures };
};

const buildAroundQuery = (
  points: POISearchPoint[],
  radiusKm: number,
  limit: number
) => {
  const radiusMeters = Math.round(clamp(radiusKm, 0.5, 50) * 1000);
  const venueFilters = [
    `["amenity"~"cafe|restaurant|food_court|fast_food|ice_cream|bar|pub|library|cinema|theatre|arts_centre|community_centre|marketplace"]["name"]`,
    `["leisure"~"park|garden|bowling_alley|sports_centre|fitness_centre"]["name"]`,
    `["tourism"~"museum|attraction|gallery|hotel"]["name"]`,
    `["shop"~"mall|department_store|books"]["name"]`,
    `["natural"="beach"]["name"]`
  ];
  const pointLimit = radiusKm > 12 ? 3 : radiusKm > 6 ? 5 : 7;
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
  [out:json][timeout:10];
  (
    ${blocks}
  );
  out center ${limit};
  `;
};

export async function fetchMeetingPOIsNearPoints(
  points: POISearchPoint[],
  radiusKm: number,
  limit = 80,
  timeoutMs = 4500
): Promise<OverpassPOI[]> {
  if (points.length === 0) return [];

  const query = buildAroundQuery(points, radiusKm, limit);
  const { pois: responsePois, failures } = await fetchFirstOverpassResponse(
    query,
    timeoutMs
  );
  const pois = dedupePOIs(responsePois)
    .filter((poi) => Number.isFinite(poi.lat) && Number.isFinite(poi.lon))
    .slice(0, limit);

  console.log("Fast Overpass POIs:", pois.length);
  if (pois.length === 0 && failures.length > 0) {
    console.log("Live POI lookup unavailable at this radius.");
  }

  if (pois.length === 0 && failures.length === OVERPASS_ENDPOINTS.length) {
    throw new POILookupUnavailableError(failures);
  }

  return pois;
}

export async function fetchPhotonMeetingPOIsNearPoints(
  points: POISearchPoint[],
  radiusKm: number,
  limit = 80,
  timeoutMs = 3500
): Promise<OverpassPOI[]> {
  if (points.length === 0) return [];

  const searchPoints = points.slice(0, 3);
  const maxDistanceKm = clamp(radiusKm, 2, 35);
  const requests = searchPoints.flatMap((point) =>
    PHOTON_MEETING_QUERIES.map((query) =>
      fetchPhotonQuery(query, point, timeoutMs)
    )
  );
  const settled = await Promise.allSettled(requests);
  const pois = settled
    .flatMap((result) => (
      result.status === "fulfilled" ? result.value : []
    ))
    .filter((poi) =>
      searchPoints.some((point) =>
        getDistanceKm(point, { lat: poi.lat, lon: poi.lon }) <= maxDistanceKm
      )
    );
  const deduped = dedupePOIs(pois);

  return deduped
    .sort((left, right) => {
      const nearestLeft = Math.min(
        ...searchPoints.map((point) =>
          getDistanceKm(point, { lat: left.lat, lon: left.lon })
        )
      );
      const nearestRight = Math.min(
        ...searchPoints.map((point) =>
          getDistanceKm(point, { lat: right.lat, lon: right.lon })
        )
      );

      return nearestLeft - nearestRight;
    })
    .slice(0, limit);
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
    node["amenity"~"cafe|restaurant|fast_food|food_court|ice_cream"]["name"](${south},${west},${north},${east});
    way["amenity"~"cafe|restaurant|fast_food|food_court|ice_cream"]["name"](${south},${west},${north},${east});
    node["amenity"~"library|cinema|theatre|arts_centre|community_centre|marketplace|bar|pub"]["name"](${south},${west},${north},${east});
    way["amenity"~"library|cinema|theatre|arts_centre|community_centre|marketplace|bar|pub"]["name"](${south},${west},${north},${east});
    node["leisure"~"park|garden|bowling_alley|sports_centre|fitness_centre"]["name"](${south},${west},${north},${east});
    way["leisure"~"park|garden|bowling_alley|sports_centre|fitness_centre"]["name"](${south},${west},${north},${east});
    node["tourism"~"museum|attraction|gallery|hotel"]["name"](${south},${west},${north},${east});
    way["tourism"~"museum|attraction|gallery|hotel"]["name"](${south},${west},${north},${east});
    node["shop"~"mall|department_store|books"]["name"](${south},${west},${north},${east});
    way["shop"~"mall|department_store|books"]["name"](${south},${west},${north},${east});
    node["natural"="beach"]["name"](${south},${west},${north},${east});
    way["natural"="beach"]["name"](${south},${west},${north},${east});
  );

  out center;
  `;

  try {
    const { pois: responsePois, failures } = await fetchFirstOverpassResponse(
      query,
      12000
    );

    if (responsePois.length === 0 && failures.length > 0) {
      console.error("Overpass lookups failed:", failures.join("; "));
    }

    const pois = dedupePOIs(responsePois);

    /* ==============================
       FILTER POIs INSIDE POLYGON
    =============================== */

    const filtered = pois.filter((p) => {

      if (!Number.isFinite(p.lat) || !Number.isFinite(p.lon)) return false;

      const point = turf.point([p.lon, p.lat]);

      return turf.booleanPointInPolygon(point, polygon as any);
    });

    console.log("Overpass returned:", pois.length);
    console.log("Inside polygon:", filtered.length);

    return filtered;

  } catch (err: any) {

    console.error("Overpass request failed:", err.message);

    return [];
  }
}
