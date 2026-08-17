import mongoose, { Document, Schema } from "mongoose";

export type CachedPlaceSource = "curated" | "photon";

export interface ICachedPlace extends Document {
  serviceAreaId: string;
  canonicalName: string;
  normalizedName: string;
  aliases: string[];
  normalizedAliases: string[];
  addressParts: string[];
  searchTokens: string[];
  searchGrams: string[];
  lat: number;
  lng: number;
  source: CachedPlaceSource;
  sourceId?: string;
  selectedCount: number;
  lastSelectedAt?: Date;
  lastSeenAt: Date;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const cachedPlaceSchema = new Schema<ICachedPlace>(
  {
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
      index: true,
    },
  },
  { timestamps: true }
);

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

export const CachedPlace = mongoose.model<ICachedPlace>("CachedPlace", cachedPlaceSchema);
