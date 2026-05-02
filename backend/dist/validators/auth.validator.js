"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProfileSchema = exports.loginSchema = exports.registerSchema = void 0;
const zod_1 = require("zod");
exports.registerSchema = zod_1.z.object({
    name: zod_1.z
        .string()
        .trim()
        .min(2, "Name must be at least 2 characters long")
        .max(80, "Name must be 80 characters or fewer"),
    email: zod_1.z
        .string()
        .trim()
        .toLowerCase()
        .email("Invalid email address")
        .max(254, "Email must be 254 characters or fewer"),
    password: zod_1.z
        .string()
        .min(12, "Password must be at least 12 characters long")
        .max(128, "Password must be 128 characters or fewer")
        .regex(/[a-z]/, "Password must contain a lowercase letter")
        .regex(/[A-Z]/, "Password must contain an uppercase letter")
        .regex(/[0-9]/, "Password must contain a number")
        .regex(/[^A-Za-z0-9]/, "Password must contain a symbol"),
});
exports.loginSchema = zod_1.z
    .object({
    email: zod_1.z
        .string()
        .trim()
        .toLowerCase()
        .email("Invalid email address")
        .max(254),
    password: zod_1.z.string().min(1).max(128),
})
    .strict();
exports.updateProfileSchema = zod_1.z
    .object({
    name: zod_1.z.string().trim().min(2).max(80).optional(),
    avatarUrl: zod_1.z
        .union([
        zod_1.z.literal(null),
        zod_1.z
            .string()
            .trim()
            .url("Avatar URL must be valid")
            .max(2048)
            .refine((value) => new URL(value).protocol === "https:", {
            message: "Avatar URL must use HTTPS",
        }),
    ])
        .optional(),
    notificationsEnabled: zod_1.z.boolean().optional(),
    privacyMode: zod_1.z.boolean().optional(),
})
    .strict()
    .refine((value) => Object.keys(value).length > 0, {
    message: "At least one profile field is required",
});
//# sourceMappingURL=auth.validator.js.map