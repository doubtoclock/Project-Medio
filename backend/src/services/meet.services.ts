import * as turf from "@turf/turf";
import { Coordinates } from "./isochrone.services";
import {
  fetchMeetingPOIs,
  fetchMeetingPOIsNearPoints,
  fetchPhotonMeetingPOIsNearPoints,
  OverpassPOI,
  POILookupUnavailableError
} from "./poi.services";
import { generateSurfaceIntersection } from "./surface.services";
import { getOtpDuration } from "./otp.services";

type MeetingSource = "osm" | "photon" | "estimated";

type MeetCandidate = OverpassPOI & {
  source: MeetingSource;
};

type RouteSeed = {
  lat: number;
  lon: number;
  name: string;
};

type ScoredPoi = {
  id: number;
  name: string;
  lat: number;
  lon: number;
  category: string;
  source: MeetingSource;
  travelTimeA: number;
  travelTimeB: number;
  difference: number;
  average: number;
  maxTravelTime: number;
  score: number;
  reason: string;
};

const MAX_RESULTS = 12;
const POI_TIMEOUT_MS = 3000;
const PRE_RANK_LIMIT = 35;
const MIN_LIVE_RESULTS = 14;
const POI_BATCH_LIMIT = 160;
const MAX_EXPANDED_RADIUS_KM = 50;
const MEET_CACHE_VERSION = "v4";
const MEET_CACHE_BUCKET_DEGREES = 0.003;
const MEET_CACHE_TTL_MS = 45 * 60 * 1000;
const MEET_CACHE_LIMIT = 80;
const MAX_REASONABLE_MEETING_MINUTES = 180;
const MAX_SURFACE_MEETING_MINUTES = 360;
const SURFACE_STEP_MINUTES = 15;
const SURFACE_BUFFER_KM = 2;

type MeetCacheEntry = {
  results: ScoredPoi[];
  expiresAt: number;
  lastUsed: number;
  hits: number;
};

const meetCache = new Map<string, MeetCacheEntry>();
const pendingMeetSearches = new Map<string, Promise<ScoredPoi[]>>();

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const bucketCoordinate = (value: number) =>
  (Math.round(value / MEET_CACHE_BUCKET_DEGREES) *
    MEET_CACHE_BUCKET_DEGREES).toFixed(3);

const getMeetCacheKey = (A: Coordinates, B: Coordinates) =>
  [
    MEET_CACHE_VERSION,
    bucketCoordinate(A.lat),
    bucketCoordinate(A.lon),
    bucketCoordinate(B.lat),
    bucketCoordinate(B.lon)
  ].join(":");

const pruneMeetCache = () => {
  const now = Date.now();

  for (const [key, entry] of meetCache.entries()) {
    if (entry.expiresAt <= now) {
      meetCache.delete(key);
    }
  }

  if (meetCache.size <= MEET_CACHE_LIMIT) return;

  const entries = [...meetCache.entries()].sort(
    (left, right) =>
      left[1].lastUsed + left[1].hits * 1000 -
      (right[1].lastUsed + right[1].hits * 1000)
  );
  const removeCount = meetCache.size - MEET_CACHE_LIMIT;

  entries.slice(0, removeCount).forEach(([key]) => meetCache.delete(key));
};

const getCachedMeetResults = (key: string) => {
  const cached = meetCache.get(key);
  const now = Date.now();

  if (!cached) return null;

  if (cached.expiresAt <= now) {
    meetCache.delete(key);
    return null;
  }

  cached.lastUsed = now;
  cached.hits += 1;
  return cached.results;
};

const setCachedMeetResults = (key: string, results: ScoredPoi[]) => {
  const cacheTtlMs = results.every((result) => result.source === "estimated")
    ? 5 * 60 * 1000
    : MEET_CACHE_TTL_MS;

  meetCache.set(key, {
    results,
    expiresAt: Date.now() + cacheTtlMs,
    lastUsed: Date.now(),
    hits: 0
  });
  pruneMeetCache();
};

const toPoint = (coords: Coordinates) => turf.point([coords.lon, coords.lat]);

const getDistanceKm = (from: Coordinates, to: Coordinates) =>
  turf.distance(toPoint(from), toPoint(to), { units: "kilometers" });

const getFallbackDuration = (from: Coordinates, to: Coordinates) => {
  const distance = getDistanceKm(from, to);
  const avgSpeed = distance < 3 ? 5 : distance < 15 ? 12 : 20;

  return (distance / avgSpeed) * 3600;
};

const getPoiCategory = (tags: Record<string, string> = {}) => {
  if (tags.amenity === "cafe") return "Cafe";
  if (tags.amenity === "restaurant") return "Restaurant";
  if (tags.amenity === "food_court") return "Food court";
  if (tags.amenity === "ice_cream") return "Dessert";
  if (tags.amenity === "fast_food") return "Quick bite";
  if (tags.amenity === "bar" || tags.amenity === "pub") return "Bar";
  if (tags.amenity === "library") return "Library";
  if (tags.amenity === "cinema") return "Cinema";
  if (tags.amenity === "theatre") return "Theatre";
  if (tags.amenity === "arts_centre") return "Arts center";
  if (tags.amenity === "community_centre") return "Community center";
  if (tags.amenity === "marketplace") return "Market";
  if (tags.amenity === "college" || tags.amenity === "university") {
    return "Campus";
  }
  if (tags.leisure === "park" || tags.amenity === "park") return "Park";
  if (tags.leisure === "garden") return "Garden";
  if (tags.leisure === "bowling_alley") return "Bowling";
  if (
    tags.leisure === "sports_centre" ||
    tags.leisure === "fitness_centre"
  ) {
    return "Sports";
  }
  if (tags.tourism === "museum") return "Museum";
  if (tags.tourism === "gallery") return "Gallery";
  if (tags.tourism === "attraction") return "Attraction";
  if (tags.tourism === "hotel") return "Hotel";
  if (tags.shop === "mall" || tags.shop === "department_store") return "Mall";
  if (tags.shop === "books") return "Bookstore";
  if (tags.natural === "beach") return "Beach";
  return "Place";
};

const getVenueScore = (tags: Record<string, string> = {}) => {
  const category = getPoiCategory(tags);
  const categoryScores: Record<string, number> = {
    Cafe: 1,
    Restaurant: 0.92,
    Mall: 0.88,
    "Food court": 0.86,
    Dessert: 0.84,
    Park: 0.82,
    Garden: 0.8,
    Cinema: 0.78,
    Theatre: 0.77,
    Museum: 0.76,
    Gallery: 0.75,
    "Arts center": 0.74,
    Library: 0.72,
    "Community center": 0.71,
    Bar: 0.7,
    Bookstore: 0.69,
    "Quick bite": 0.68,
    Market: 0.67,
    Attraction: 0.66,
    Bowling: 0.65,
    Sports: 0.64,
    Beach: 0.63,
    Hotel: 0.62,
    Campus: 0.62,
    Place: 0.55
  };

  let score = categoryScores[category] ?? categoryScores.Place;

  if (tags.name) score += 0.08;
  if (tags.opening_hours) score += 0.04;
  if (tags.website || tags.phone || tags["contact:phone"]) score += 0.03;

  return clamp(score, 0, 1);
};

const getMeetQualityReason = (
  differenceMinutes: number,
  category: string
) => {
  if (differenceMinutes <= 5) {
    return `Very fair ${category.toLowerCase()} with almost equal travel time`;
  }

  if (differenceMinutes <= 12) {
    return `Balanced ${category.toLowerCase()} with a small travel-time gap`;
  }

  return `${category} with the shortest practical max travel time`;
};

const getSearchRadiusKm = (distanceKm: number) => {
  if (distanceKm < 3) return 1.5;
  if (distanceKm < 20) return 3;
  if (distanceKm < 80) return 6;
  if (distanceKm < 250) return 12;
  return 20;
};

const getExpandedSearchRadii = (baseRadiusKm: number) => {
  const multipliers = [1, 1.7, 2.8, 4.5, 7];
  const radii = multipliers.map((multiplier) =>
    Math.round(clamp(
      baseRadiusKm * multiplier,
      baseRadiusKm,
      MAX_EXPANDED_RADIUS_KM
    ) * 10) / 10
  );

  return Array.from(new Set(radii));
};

const getQuickSearchRadiusKm = (baseRadiusKm: number) =>
  Math.round(clamp(baseRadiusKm * 3, 5, MAX_EXPANDED_RADIUS_KM) * 10) / 10;

const routePoint = (
  line: any,
  distanceKm: number,
  fraction: number
) => {
  const point = turf.along(line, distanceKm * fraction, {
    units: "kilometers"
  });
  const [lon, lat] = point.geometry.coordinates;

  return { lat, lon };
};

const offsetPoint = (
  point: Coordinates,
  offsetKm: number,
  bearing: number
) => {
  if (offsetKm === 0) return point;

  const destination = turf.destination(
    turf.point([point.lon, point.lat]),
    Math.abs(offsetKm),
    offsetKm > 0 ? bearing : bearing + 180,
    { units: "kilometers" }
  );
  const [lon, lat] = destination.geometry.coordinates;

  return { lat, lon };
};

const buildRouteSeeds = (A: Coordinates, B: Coordinates): RouteSeed[] => {
  const directDistanceKm = getDistanceKm(A, B);

  if (directDistanceKm < 0.1) {
    const bearings = [0, 72, 144, 216, 288];

    return bearings.map((bearing, index) => {
      const point = offsetPoint(A, index === 0 ? 0 : 0.5, bearing);

      return {
        ...point,
        name: index === 0
          ? "Closest shared meeting area"
          : `Nearby meeting area ${index + 1}`
      };
    });
  }

  const line = turf.lineString([
    [A.lon, A.lat],
    [B.lon, B.lat]
  ]);
  const bearing = turf.bearing(toPoint(A), toPoint(B)) + 90;
  const offsetKm = clamp(directDistanceKm * 0.04, 0.25, 8);
  const seedConfigs = [
    { fraction: 0.5, offset: 0, name: "Most balanced meeting area" },
    { fraction: 0.47, offset: 0, name: "Balanced option closer to User A" },
    { fraction: 0.53, offset: 0, name: "Balanced option closer to User B" },
    { fraction: 0.5, offset: offsetKm, name: "Route-side meeting area 1" },
    { fraction: 0.5, offset: -offsetKm, name: "Route-side meeting area 2" },
    { fraction: 0.43, offset: offsetKm * 0.5, name: "Wider fair-area option 1" },
    { fraction: 0.57, offset: -offsetKm * 0.5, name: "Wider fair-area option 2" }
  ];

  return seedConfigs.map((seed) => {
    const basePoint = routePoint(line, directDistanceKm, seed.fraction);
    const point = offsetPoint(basePoint, seed.offset, bearing);

    return {
      ...point,
      name: seed.name
    };
  });
};

const getPoiKey = (poi: OverpassPOI) => `${poi.type || "node"}:${poi.id}`;

const hasUsableName = (poi: OverpassPOI) => {
  const name = poi.tags?.name?.trim();
  return Boolean(name && name.length > 1);
};

const mergeUniquePois = (
  existing: OverpassPOI[],
  next: OverpassPOI[]
) => {
  const seen = new Set(existing.map(getPoiKey));
  const merged = [...existing];

  next.forEach((poi) => {
    const key = getPoiKey(poi);
    if (seen.has(key)) return;
    seen.add(key);
    merged.push(poi);
  });

  return merged;
};

const fetchExpandedMeetingPOIs = async (
  seeds: RouteSeed[],
  baseRadiusKm: number
) => {
  let results: OverpassPOI[] = [];
  const quickRadiusKm = getQuickSearchRadiusKm(baseRadiusKm);
  const isLookupUnavailable = (err: unknown) =>
    err instanceof POILookupUnavailableError ||
    (err instanceof Error && err.name === "POILookupUnavailableError");

  try {
    const quickPois = await fetchMeetingPOIsNearPoints(
      seeds.slice(0, 1),
      quickRadiusKm,
      POI_BATCH_LIMIT,
      POI_TIMEOUT_MS
    );
    results = mergeUniquePois(results, quickPois.filter(hasUsableName));

    console.log(
      `Named meeting venues in quick ${quickRadiusKm}km search: ${results.length}`
    );

    if (results.length >= MIN_LIVE_RESULTS) {
      return results.slice(0, POI_BATCH_LIMIT);
    }
  } catch (err) {
    console.log("Quick meeting venue search failed:", err);
    if (isLookupUnavailable(err)) return [];
  }

  for (const radiusKm of getExpandedSearchRadii(baseRadiusKm)) {
    try {
      const pois = await fetchMeetingPOIsNearPoints(
        seeds,
        radiusKm,
        POI_BATCH_LIMIT,
        POI_TIMEOUT_MS
      );
      const namedPois = pois.filter(hasUsableName);
      results = mergeUniquePois(results, namedPois);

      console.log(
        `Named meeting venues within ${radiusKm}km: ${results.length}`
      );

      if (results.length >= MIN_LIVE_RESULTS) break;
    } catch (err) {
      console.log("Meeting venue search step failed:", radiusKm, err);
      if (isLookupUnavailable(err)) break;
    }
  }

  return results.slice(0, POI_BATCH_LIMIT);
};

const fetchPhotonFallbackMeetingPOIs = async (
  seeds: RouteSeed[],
  baseRadiusKm: number
) => {
  try {
    const radiusKm = getQuickSearchRadiusKm(baseRadiusKm);
    const pois = await fetchPhotonMeetingPOIsNearPoints(
      seeds,
      radiusKm,
      POI_BATCH_LIMIT,
      3500
    );

    console.log(`Photon fallback meeting venues: ${pois.length}`);
    return pois.filter(hasUsableName);
  } catch (err) {
    console.log("Photon meeting venue fallback failed:", err);
    return [];
  }
};

const preRankCandidate = (
  poi: MeetCandidate,
  A: Coordinates,
  B: Coordinates,
  directDistanceKm: number
) => {
  const point = { lat: poi.lat, lon: poi.lon };
  const distA = getDistanceKm(A, point);
  const distB = getDistanceKm(B, point);
  const totalDistance = distA + distB;
  const maxDistance = Math.max(distA, distB);
  const balanceRatio = Math.abs(distA - distB) / Math.max(totalDistance, 1);
  const detourRatio = totalDistance / Math.max(directDistanceKm, 1);

  return {
    poi,
    rank:
      maxDistance * 0.45 +
      totalDistance * 0.2 +
      balanceRatio * 18 +
      detourRatio * 4 -
      getVenueScore(poi.tags) * 5
  };
};

const scoreCandidateWithDurations = (
  poi: MeetCandidate,
  timeA: number,
  timeB: number
): ScoredPoi => {
  const diff = Math.abs(timeA - timeB);
  const average = (timeA + timeB) / 2;
  const maxTravelTime = Math.max(timeA, timeB);
  const category = getPoiCategory(poi.tags);
  const venueScore = getVenueScore(poi.tags);
  const score =
    (maxTravelTime / 60) * 0.42 +
    (average / 60) * 0.24 +
    (diff / 60) * 0.26 -
    venueScore * 10;

  return {
    id: poi.id,
    name: poi.tags?.name || "Recommended meeting spot",
    lat: poi.lat,
    lon: poi.lon,
    category,
    source: poi.source,
    travelTimeA: Math.round(timeA / 60),
    travelTimeB: Math.round(timeB / 60),
    difference: Math.round(diff / 60),
    average: Math.round(average / 60),
    maxTravelTime: Math.round(maxTravelTime / 60),
    score: Number(score.toFixed(2)),
    reason: getMeetQualityReason(
      Math.round(diff / 60),
      category
    )
  };
};

const scoreCandidate = (
  poi: MeetCandidate,
  A: Coordinates,
  B: Coordinates
): ScoredPoi => {
  const point = { lat: poi.lat, lon: poi.lon };
  const timeA = getFallbackDuration(A, point);
  const timeB = getFallbackDuration(B, point);

  return scoreCandidateWithDurations(poi, timeA, timeB);
};

const getOtpOrFallbackDuration = async (
  from: Coordinates,
  to: Coordinates
) => {
  const duration = await getOtpDuration(
    from.lat,
    from.lon,
    to.lat,
    to.lon
  );

  return duration && duration > 0 ? duration : getFallbackDuration(from, to);
};

const scoreCandidateWithOtpFallback = async (
  poi: MeetCandidate,
  A: Coordinates,
  B: Coordinates
) => {
  const point = { lat: poi.lat, lon: poi.lon };
  const [timeA, timeB] = await Promise.all([
    getOtpOrFallbackDuration(A, point),
    getOtpOrFallbackDuration(B, point)
  ]);

  return scoreCandidateWithDurations(poi, timeA, timeB);
};

const diversifyResults = (pois: ScoredPoi[]) => {
  const selected: ScoredPoi[] = [];
  const selectedIds = new Set<number>();
  const categoryCounts = new Map<string, number>();
  const categoryLimits = [2, 3, MAX_RESULTS];

  for (const limit of categoryLimits) {
    for (const poi of pois) {
      if (selected.length >= MAX_RESULTS) return selected;
      if (selectedIds.has(poi.id)) continue;

      const count = categoryCounts.get(poi.category) ?? 0;
      if (count >= limit) continue;

      selected.push(poi);
      selectedIds.add(poi.id);
      categoryCounts.set(poi.category, count + 1);
    }
  }

  return selected;
};

const rankScoredResults = (pois: ScoredPoi[]) =>
  diversifyResults(
    pois.sort((a, b) => {
      if (a.score !== b.score) return a.score - b.score;
      if (a.maxTravelTime !== b.maxTravelTime) {
        return a.maxTravelTime - b.maxTravelTime;
      }
      return a.difference - b.difference;
    })
  );

const buildEstimatedMeetResults = (
  seeds: RouteSeed[],
  A: Coordinates,
  B: Coordinates
) => {
  const estimatedCandidates: MeetCandidate[] = seeds
    .slice(0, 5)
    .map((seed, index) => ({
      id: -1 * (index + 1),
      lat: seed.lat,
      lon: seed.lon,
      tags: { name: seed.name },
      source: "estimated"
    }));

  return rankScoredResults(
    estimatedCandidates.map((poi) => ({
      ...scoreCandidate(poi, A, B),
      category: "Place",
      reason: "Estimated fair meeting area while venue lookup is unavailable"
    }))
  );
};

const findSurfaceMeetPois = async (
  A: Coordinates,
  B: Coordinates
) => {
  const directDuration = await getOtpDuration(
    A.lat,
    A.lon,
    B.lat,
    B.lon,
    3500
  );

  if (!directDuration || directDuration <= 0) {
    console.log("Surface fallback skipped because OTP is unavailable");
    return [];
  }

  let meetingMinutes = Math.ceil(directDuration / 2 / 60);
  meetingMinutes = Math.min(
    meetingMinutes,
    MAX_REASONABLE_MEETING_MINUTES
  );

  let polygon: any = null;

  while (meetingMinutes <= MAX_SURFACE_MEETING_MINUTES) {
    try {
      polygon = await generateSurfaceIntersection(A, B, meetingMinutes);
      if (polygon) break;
    } catch (err) {
      console.log("Surface fallback generation failed:", err);
    }

    meetingMinutes += SURFACE_STEP_MINUTES;
  }

  if (!polygon) return [];

  let pois = await fetchMeetingPOIs(polygon);

  if (pois.length === 0) {
    try {
      const expandedPolygon = turf.buffer(polygon, SURFACE_BUFFER_KM, {
        units: "kilometers"
      });

      if (expandedPolygon) {
        pois = await fetchMeetingPOIs(expandedPolygon as any);
      }
    } catch (err) {
      console.log("Surface fallback buffer failed:", err);
    }
  }

  return pois.filter(hasUsableName);
};

const findMeetPointsWithSurfaceFallback = async (
  A: Coordinates,
  B: Coordinates,
  directDistanceKm: number
) => {
  const surfacePois = await findSurfaceMeetPois(A, B);

  if (surfacePois.length === 0) return [];

  const candidates: MeetCandidate[] = surfacePois.map((poi) => ({
    ...poi,
    source: "osm"
  }));
  const candidatePois = candidates
    .map((poi) => preRankCandidate(poi, A, B, directDistanceKm))
    .sort((left, right) => left.rank - right.rank)
    .map((candidate) => candidate.poi)
    .slice(0, PRE_RANK_LIMIT);
  const enriched = await Promise.all(
    candidatePois.map((poi) => scoreCandidateWithOtpFallback(poi, A, B))
  );

  return rankScoredResults(enriched);
};

const findMeetPointsLive = async (
  A: Coordinates,
  B: Coordinates
) => {
  const startedAt = Date.now();
  const directDistanceKm = getDistanceKm(A, B);
  const seeds = buildRouteSeeds(A, B);

  console.log("=== FAST MEET SEARCH ===");
  console.log("Direct distance:", directDistanceKm.toFixed(2), "km");

  const poiRadiusKm = getSearchRadiusKm(directDistanceKm);
  const livePois = await fetchExpandedMeetingPOIs(seeds, poiRadiusKm);

  const osmCandidates: MeetCandidate[] = livePois.map((poi) => ({
    ...poi,
    source: "osm"
  }));

  if (osmCandidates.length === 0) {
    console.log(
      `No named meeting venues found after expanding to ${MAX_EXPANDED_RADIUS_KM}km`
    );

    const photonResults = fetchPhotonFallbackMeetingPOIs(
      seeds,
      poiRadiusKm
    );
    const photonCandidates: MeetCandidate[] = (await photonResults).map(
      (poi) => ({
        ...poi,
        source: "photon"
      })
    );

    if (photonCandidates.length > 0) {
      const photonScored = photonCandidates
        .map((poi) => preRankCandidate(poi, A, B, directDistanceKm))
        .sort((left, right) => left.rank - right.rank)
        .map((candidate) => candidate.poi)
        .slice(0, PRE_RANK_LIMIT)
        .map((poi) => scoreCandidate(poi, A, B));
      const photonRanked = rankScoredResults(photonScored);

      console.log(`Photon fallback returned ${photonRanked.length} results`);
      return photonRanked;
    }

    const surfaceResults = await findMeetPointsWithSurfaceFallback(
      A,
      B,
      directDistanceKm
    );

    if (surfaceResults.length > 0) {
      console.log(`Surface fallback returned ${surfaceResults.length} results`);
      return surfaceResults;
    }

    const estimatedResults = buildEstimatedMeetResults(seeds, A, B);
    console.log(
      `Estimated fallback returned ${estimatedResults.length} results`
    );
    return estimatedResults;
  }

  const candidatePois = osmCandidates
    .map((poi) => preRankCandidate(poi, A, B, directDistanceKm))
    .sort((left, right) => left.rank - right.rank)
    .map((candidate) => candidate.poi)
    .slice(0, PRE_RANK_LIMIT);

  const enriched = candidatePois.map((poi) => scoreCandidate(poi, A, B));

  const ranked = rankScoredResults(enriched);

  console.log(
    `Final top ${ranked.length} ready in ${Date.now() - startedAt}ms`
  );

  return ranked;
};

export async function findMeetPoints(
  A: Coordinates,
  B: Coordinates
) {
  const cacheKey = getMeetCacheKey(A, B);
  const cachedResults = getCachedMeetResults(cacheKey);

  if (cachedResults) {
    console.log(`Meet cache hit: ${cacheKey}`);
    return cachedResults;
  }

  const pendingSearch = pendingMeetSearches.get(cacheKey);
  if (pendingSearch) {
    console.log(`Meet cache pending hit: ${cacheKey}`);
    return pendingSearch;
  }

  const search = findMeetPointsLive(A, B)
    .then((results) => {
      setCachedMeetResults(cacheKey, results);
      return results;
    })
    .finally(() => {
      pendingMeetSearches.delete(cacheKey);
    });

  pendingMeetSearches.set(cacheKey, search);
  return search;
}
