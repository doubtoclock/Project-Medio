import assert from "node:assert/strict";
import { isConfidentPlaceScore, scoreCachedPlace } from "../utils/place-search";

const versovaPlace = {
  canonicalName: "Versova, Andheri West, Mumbai",
  normalizedName: "versova andheri west mumbai",
  normalizedAliases: ["versova", "versova andheri"],
  addressParts: ["Andheri West", "Mumbai"],
  searchTokens: ["versova", "andheri", "west", "mumbai"],
  selectedCount: 0,
  lat: 19.1312,
  lng: 72.8146,
};

const queries = ["versiva", "virsovaa", "virsowa", "versova", "versova mumbai"];

for (const query of queries) {
  const score = scoreCachedPlace(query, versovaPlace);
  assert.equal(
    isConfidentPlaceScore(score),
    true,
    `${query} should confidently surface Versova in Mumbai; score=${score}`
  );
}

console.log("Place-search typo tests passed");
