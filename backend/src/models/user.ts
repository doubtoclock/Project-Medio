import mongoose, { Document, Schema } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  avatarUrl?: string;
  notificationsEnabled: boolean;
  privacyMode: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true,
      unique: true
    },
    password: {
      type: String,
      required: true
    },
    avatarUrl: {
      type: String
    },
    notificationsEnabled: {
      type: Boolean,
      default: true
    },
    privacyMode: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

export const User = mongoose.model<IUser>("User", userSchema);
