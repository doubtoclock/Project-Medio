import type { ICachedPlace } from "../models/cached-place";
import { getLevenshteinDistance, normalizeForFuzzy } from "./fuzzy";

export type CachedPlaceLike = Pick<
  ICachedPlace,
  | "canonicalName"
  | "normalizedName"
  | "normalizedAliases"
  | "addressParts"
  | "searchTokens"
  | "selectedCount"
  | "lastSelectedAt"
  | "lat"
  | "lng"
>;

const CITY_HINT_TOKENS = new Set([
  "mumbai",
  "greater",
  "city",
  "suburban",
  "mira",
  "bhayandar",
  "bhayander",
]);

export const normalizePlaceText = (value: string) => normalizeForFuzzy(value);

export const getPlaceSearchTokens = (values: string[]) =>
  Array.from(
    new Set(
      values
        .flatMap((value) => normalizePlaceText(value).split(" "))
        .filter((token) => token.length > 1)
    )
  ).slice(0, 80);

export const getPlaceSearchGrams = (values: string[]) => {
  const grams = new Set<string>();

  for (const value of values) {
    const normalized = normalizePlaceText(value).replace(/\s+/g, "");
    if (!normalized) continue;

    if (normalized.length <= 3) {
      grams.add(normalized);
      continue;
    }

    for (let index = 0; index <= normalized.length - 3; index += 1) {
      grams.add(normalized.slice(index, index + 3));
    }
  }

  return Array.from(grams).slice(0, 160);
};

const getSimilarity = (left: string, right: string) => {
  if (left === right) return 1;
  if (!left || !right) return 0;

  const distance = getLevenshteinDistance(left, right);
  const maxLength = Math.max(left.length, right.length);
  return Math.max(0, 1 - distance / maxLength);
};

const getTokenScore = (queryToken: string, candidateToken: string) => {
  if (queryToken === candidateToken) return 1;
  if (candidateToken.startsWith(queryToken)) return queryToken.length >= 3 ? 0.92 : 0.8;
  if (queryToken.startsWith(candidateToken) && candidateToken.length >= 4) return 0.86;

  const distance = getLevenshteinDistance(queryToken, candidateToken);
  if (queryToken.length >= 5 && distance <= 2) return 0.82;
  if (queryToken.length >= 4 && distance <= 1) return 0.84;

  const similarity = getSimilarity(queryToken, candidateToken);
  if (queryToken.length >= 7 && similarity >= 0.7) return similarity;
  if (queryToken.length >= 5 && similarity >= 0.66) return similarity;
  if (queryToken.length >= 4 && similarity >= 0.8) return similarity;

  return 0;
};

const getBestTokenScore = (queryToken: string, candidateTokens: string[]) =>
  candidateTokens.reduce(
    (best, candidateToken) => Math.max(best, getTokenScore(queryToken, candidateToken)),
    0
  );

export const scoreCachedPlace = (query: string, place: CachedPlaceLike) => {
  const normalizedQuery = normalizePlaceText(query);
  if (!normalizedQuery) return 0;

  const queryTokens = normalizedQuery.split(" ").filter(Boolean);
  const meaningfulTokens = queryTokens.filter((token) => !CITY_HINT_TOKENS.has(token));
  const tokensToMatch = meaningfulTokens.length > 0 ? meaningfulTokens : queryTokens;
  const candidateNames = [
    place.normalizedName,
    ...place.normalizedAliases,
    ...place.addressParts.map(normalizePlaceText),
  ].filter(Boolean);
  const candidateTokens = Array.from(
    new Set([
      ...place.searchTokens,
      ...candidateNames.flatMap((name) => name.split(" ").filter(Boolean)),
    ])
  );

  if (candidateTokens.length === 0) return 0;

  const bestNameScore = candidateNames.reduce((best, candidateName) => {
    if (candidateName === normalizedQuery) return Math.max(best, 100);
    if (candidateName.startsWith(normalizedQuery)) return Math.max(best, 94);
    if (candidateName.includes(normalizedQuery)) return Math.max(best, 88);

    const compactQuery = normalizedQuery.replace(/\s+/g, "");
    const compactCandidate = candidateName.replace(/\s+/g, "");
    if (compactCandidate === compactQuery) return Math.max(best, 98);
    if (compactCandidate.includes(compactQuery)) return Math.max(best, 86);

    return Math.max(best, getSimilarity(compactQuery, compactCandidate) * 82);
  }, 0);

  const tokenScores = tokensToMatch.map((token) => getBestTokenScore(token, candidateTokens));
  const tokenCoverage = tokenScores.reduce((sum, score) => sum + score, 0) / tokensToMatch.length;
  const allImportantTokensMatch = tokenScores.every((score) => score >= 0.66);

  if (!allImportantTokensMatch && bestNameScore < 80) return 0;

  const cityHintBonus = meaningfulTokens.length < queryTokens.length ? 3 : 0;
  const selectionBonus = Math.min(8, Math.log1p(place.selectedCount || 0) * 2);
  const recencyBonus = place.lastSelectedAt
    ? Math.max(0, 3 - (Date.now() - place.lastSelectedAt.getTime()) / (7 * 24 * 60 * 60 * 1000))
    : 0;

  return Math.min(
    100,
    Math.max(bestNameScore, tokenCoverage * 92) + cityHintBonus + selectionBonus + recencyBonus
  );
};

export const isConfidentPlaceScore = (score: number) => score >= 74;
