import { z } from "zod";

export const weatherQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  from: z.string().date(),
  to: z.string().date(),
  daily: z
    .string()
    .optional()
    .transform((v) => v === "true"),
});
