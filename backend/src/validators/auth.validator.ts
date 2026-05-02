import { z } from "zod";

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters long")
    .max(80, "Name must be 80 characters or fewer"),

  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Invalid email address")
    .max(254, "Email must be 254 characters or fewer"),

  password: z
    .string()
    .min(12, "Password must be at least 12 characters long")
    .max(128, "Password must be 128 characters or fewer")
    .regex(/[a-z]/, "Password must contain a lowercase letter")
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/[0-9]/, "Password must contain a number")
    .regex(/[^A-Za-z0-9]/, "Password must contain a symbol"),
});

export const loginSchema = z
  .object({
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email("Invalid email address")
      .max(254),
    password: z.string().min(1).max(128),
  })
  .strict();

export const updateProfileSchema = z
  .object({
    name: z.string().trim().min(2).max(80).optional(),
    avatarUrl: z
      .union([
        z.literal(null),
        z
          .string()
          .trim()
          .url("Avatar URL must be valid")
          .max(2048)
          .refine((value) => new URL(value).protocol === "https:", {
            message: "Avatar URL must use HTTPS",
          }),
      ])
      .optional(),
    notificationsEnabled: z.boolean().optional(),
    privacyMode: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one profile field is required",
  });

// Type inference for TypeScript
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
