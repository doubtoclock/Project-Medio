import mongoose, { Document, Schema } from "mongoose";
import type { UserRole } from "../utils/jwt";

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  authProvider: "local" | "google";
  role: UserRole;
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
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    },
    password: {
      type: String,
      required: function isPasswordRequired(this: IUser) {
        return this.authProvider === "local";
      },
      select: false
    },
    authProvider: {
      type: String,
      enum: ["local", "google"],
      default: "local"
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user"
    },
    avatarUrl: {
      type: String,
      trim: true,
      maxlength: 2048
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
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        const safeUser = ret as Record<string, unknown>;
        delete safeUser.password;
        delete safeUser.__v;
        return safeUser;
      }
    }
  }
);

export const User = mongoose.model<IUser>("User", userSchema);
