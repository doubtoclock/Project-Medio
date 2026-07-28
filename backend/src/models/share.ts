import mongoose, { Document, Schema } from "mongoose";
import crypto from "crypto";

export interface IShare extends Document {
  shareId: string;
  venue: {
    id: string;
    name: string;
    lat: number;
    lon: number;
    category?: string;
    rating?: string;
    address?: string;
    location?: string;
    image?: string;
  };
  originA?: any;
  originB?: any;
  routeDataA?: any;
  routeDataB?: any;
  routeErrorA?: string;
  routeErrorB?: string;
  createdAt: Date;
}

const shareSchema = new Schema<IShare>(
  {
    shareId: {
      type: String,
      unique: true,
      index: true,
    },
    venue: {
      type: Schema.Types.Mixed,
      required: true,
    },
    originA: { type: Schema.Types.Mixed, required: false },
    originB: { type: Schema.Types.Mixed, required: false },
    routeDataA: { type: Schema.Types.Mixed, required: false },
    routeDataB: { type: Schema.Types.Mixed, required: false },
    routeErrorA: { type: String, required: false },
    routeErrorB: { type: String, required: false },
  },
  { timestamps: true }
);

shareSchema.pre("save", function () {
  if (!this.shareId) {
    this.shareId = crypto.randomBytes(5).toString("hex").toUpperCase();
  }
});

export const Share = mongoose.model<IShare>("Share", shareSchema);
