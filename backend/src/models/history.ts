import mongoose, { Schema, Document } from "mongoose";

export interface IHistory extends Document {
  userId: mongoose.Types.ObjectId;
  action: string;
  value: string;
  createdAt: Date;
}

const historySchema = new Schema<IHistory>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    action: {
      type: String,
      required: true
    },
    value: {
      type: String,
      required: true
    }
  },
  { timestamps: true }
);

export const History = mongoose.model<IHistory>("History", historySchema);
