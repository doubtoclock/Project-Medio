import mongoose, { Schema, Document } from "mongoose";

export interface IHistory extends Document {
  userId: mongoose.Types.ObjectId;
  action: "PLACE_CREATED" | "PLACE_DELETED"; // 🔒 safer actions
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
      index: true // ⚡ faster queries per user
    },
    action: {
      type: String,
      required: true,
      enum: ["PLACE_CREATED", "PLACE_DELETED"] // 🔒 controlled values
    },
    value: {
      type: String,
      required: true
    }
  },
  { timestamps: true }
);

// ⚡ Optimize common query: get recent history of user
historySchema.index({ userId: 1, createdAt: -1 });

export const History = mongoose.model<IHistory>("History", historySchema);
