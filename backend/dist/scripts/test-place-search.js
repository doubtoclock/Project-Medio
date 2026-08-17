"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const place_search_1 = require("../utils/place-search");
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
    const score = (0, place_search_1.scoreCachedPlace)(query, versovaPlace);
    strict_1.default.equal((0, place_search_1.isConfidentPlaceScore)(score), true, `${query} should confidently surface Versova in Mumbai; score=${score}`);
}
console.log("Place-search typo tests passed");
//# sourceMappingURL=test-place-search.js.map