"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.CachedPlace = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const cachedPlaceSchema = new mongoose_1.Schema({
    serviceAreaId: {
        type: String,
        required: true,
        trim: true,
        index: true,
    },
    canonicalName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 180,
    },
    normalizedName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 180,
    },
    aliases: {
        type: [String],
        default: [],
    },
    normalizedAliases: {
        type: [String],
        default: [],
    },
    addressParts: {
        type: [String],
        default: [],
    },
    searchTokens: {
        type: [String],
        default: [],
    },
    searchGrams: {
        type: [String],
        default: [],
    },
    lat: {
        type: Number,
        required: true,
        min: -90,
        max: 90,
    },
    lng: {
        type: Number,
        required: true,
        min: -180,
        max: 180,
    },
    source: {
        type: String,
        enum: ["curated", "photon"],
        required: true,
        index: true,
    },
    sourceId: {
        type: String,
        trim: true,
    },
    selectedCount: {
        type: Number,
        default: 0,
        min: 0,
    },
    lastSelectedAt: Date,
    lastSeenAt: {
        type: Date,
        default: () => new Date(),
        index: true,
    },
    expiresAt: {
        type: Date,
        required: true,
    },
}, { timestamps: true });
cachedPlaceSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
cachedPlaceSchema.index({ serviceAreaId: 1, normalizedName: 1 });
cachedPlaceSchema.index({ serviceAreaId: 1, normalizedAliases: 1 });
cachedPlaceSchema.index({ serviceAreaId: 1, searchTokens: 1 });
cachedPlaceSchema.index({ serviceAreaId: 1, searchGrams: 1 });
cachedPlaceSchema.index({ serviceAreaId: 1, source: 1, sourceId: 1 }, { sparse: true });
cachedPlaceSchema.index({ serviceAreaId: 1, lat: 1, lng: 1 });
cachedPlaceSchema.index({
    canonicalName: "text",
    aliases: "text",
    addressParts: "text",
});
exports.CachedPlace = mongoose_1.default.model("CachedPlace", cachedPlaceSchema);
//# sourceMappingURL=cached-place.js.map