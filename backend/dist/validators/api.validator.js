"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchQuerySchema = exports.routeRequestSchema = exports.meetRequestSchema = exports.placeCreateSchema = exports.objectIdSchema = void 0;
const zod_1 = require("zod");
const text = (min, max) => zod_1.z.string().trim().min(min).max(max);
const lat = zod_1.z.coerce.number().finite().min(-90).max(90);
const lon = zod_1.z.coerce.number().finite().min(-180).max(180);
exports.objectIdSchema = zod_1.z.object({
    id: zod_1.z.string().regex(/^[a-f\d]{24}$/i, "Invalid id"),
});
exports.placeCreateSchema = zod_1.z
    .object({
    label: text(1, 80),
    address: text(1, 300),
    lat: lat.optional(),
    lng: lon.optional(),
})
    .strict();
exports.meetRequestSchema = zod_1.z
    .object({
    latA: lat,
    lonA: lon,
    latB: lat,
    lonB: lon,
    minutes: zod_1.z.coerce.number().int().min(5).max(180).optional(),
    fromName: text(1, 160).optional(),
    toName: text(1, 160).optional(),
})
    .strict();
const coordinatePairSchema = zod_1.z
    .object({
    lat,
    lng: lon,
})
    .strict();
exports.routeRequestSchema = zod_1.z
    .object({
    from: coordinatePairSchema,
    to: coordinatePairSchema,
    fromName: text(1, 160).optional(),
    toName: text(1, 160).optional(),
    travelMode: zod_1.z.enum(["car", "bike", "local", "walk"]).optional(),
    localTransport: zod_1.z
        .object({
        car: zod_1.z.boolean().optional(),
        bus: zod_1.z.boolean().optional(),
        buses: zod_1.z.boolean().optional(),
        rail: zod_1.z.boolean().optional(),
        locals: zod_1.z.boolean().optional(),
        local: zod_1.z.boolean().optional(),
        train: zod_1.z.boolean().optional(),
        subway: zod_1.z.boolean().optional(),
        metro: zod_1.z.boolean().optional(),
    })
        .strict()
        .optional(),
})
    .strict();
exports.searchQuerySchema = zod_1.z
    .object({
    q: text(2, 120),
})
    .strict();
//# sourceMappingURL=api.validator.js.map