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
  },
  { timestamps: true }
);

shareSchema.pre("save", function () {
  if (!this.shareId) {
    this.shareId = crypto.randomBytes(5).toString("hex").toUpperCase();
  }
});

export const Share = mongoose.model<IShare>("Share", shareSchema);
