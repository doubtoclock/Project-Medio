import { z } from "zod";

const text = (min: number, max: number) =>
  z.string().trim().min(min).max(max);

const lat = z.coerce.number().finite().min(-90).max(90);
const lon = z.coerce.number().finite().min(-180).max(180);

export const objectIdSchema = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i, "Invalid id"),
});

export const placeCreateSchema = z
  .object({
    label: text(1, 80),
    address: text(1, 300),
    lat: lat.optional(),
    lng: lon.optional(),
  })
  .strict();

export const meetRequestSchema = z
  .object({
    latA: lat,
    lonA: lon,
    latB: lat,
    lonB: lon,
    minutes: z.coerce.number().int().min(5).max(180).optional(),
    fromName: text(1, 160).optional(),
    toName: text(1, 160).optional(),
  })
  .strict();

const coordinatePairSchema = z
  .object({
    lat,
    lng: lon,
  })
  .strict();

export const routeRequestSchema = z
  .object({
    from: coordinatePairSchema,
    to: coordinatePairSchema,
    fromName: text(1, 160).optional(),
    toName: text(1, 160).optional(),
    travelMode: z.enum(["car", "bike", "local", "walk"]).optional(),
    localTransport: z
      .object({
        car: z.boolean().optional(),
        bus: z.boolean().optional(),
        buses: z.boolean().optional(),
        rail: z.boolean().optional(),
        locals: z.boolean().optional(),
        local: z.boolean().optional(),
        train: z.boolean().optional(),
        subway: z.boolean().optional(),
        metro: z.boolean().optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

export const searchQuerySchema = z
  .object({
    q: text(2, 120),
  })
  .strict();

export type PlaceCreateInput = z.infer<typeof placeCreateSchema>;
export type MeetRequestInput = z.infer<typeof meetRequestSchema>;
export type RouteRequestInput = z.infer<typeof routeRequestSchema>;
