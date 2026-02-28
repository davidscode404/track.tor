import { z } from "zod";

export const weatherQuerySchema = z.object({
  farmId: z.string().uuid().optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  from: z.string().date(),
  to: z.string().date(),
  daily: z
    .string()
    .optional()
    .transform((v) => v === "true"),
}).refine(
  (data) => data.farmId != null || (data.lat != null && data.lng != null),
  { message: "Either farmId or both lat and lng are required", path: ["farmId"] }
);
