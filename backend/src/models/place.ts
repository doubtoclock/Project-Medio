import mongoose, { Schema, Document } from "mongoose";

export interface IPlace extends Document {
  userId: mongoose.Types.ObjectId;
  label: string;
  address: string;
  lat?: number;
  lng?: number;
  createdAt: Date;
}

const placeSchema = new Schema<IPlace>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    label: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80
    },
    address: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300
    },
    lat: {
      type: Number,
      min: -90,
      max: 90
    },
    lng: {
      type: Number,
      min: -180,
      max: 180
    }
  },
  { timestamps: true }
);

placeSchema.index({ userId: 1, createdAt: -1 });

export const Place = mongoose.model<IPlace>("Place", placeSchema);
