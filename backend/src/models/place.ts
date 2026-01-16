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
      required: true
    },
    label: {
      type: String,
      required: true
    },
    address: {
      type: String,
      required: true
    },
    lat: Number,
    lng: Number
  },
  { timestamps: true }
);

export const Place = mongoose.model<IPlace>("Place", placeSchema);
