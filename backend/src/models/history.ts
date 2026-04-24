import mongoose, { Document, Schema } from "mongoose";

export interface IHistory extends Document {
  userId: mongoose.Types.ObjectId;
  action:
    | "PLACE_CREATED"
    | "PLACE_DELETED"
    | "ROUTE_PLANNED"
    | "MEET_SEARCHED"
    | "PROFILE_UPDATED";
  value: string;
  createdAt: Date;
  updatedAt: Date;
}

const historySchema = new Schema<IHistory>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      enum: [
        "PLACE_CREATED",
        "PLACE_DELETED",
        "ROUTE_PLANNED",
        "MEET_SEARCHED",
        "PROFILE_UPDATED",
      ],
    },
    value: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

historySchema.index({ userId: 1, createdAt: -1 });

export const History = mongoose.model<IHistory>("History", historySchema);
