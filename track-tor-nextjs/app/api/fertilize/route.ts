import { NextResponse } from "next/server";

import { addDays, formatISODate } from "@/lib/date";
import { buildFertilizeRecommendation } from "@/lib/fertilize";
import { z } from "zod";
import { fallbackWeatherProvider } from "@/lib/weather/fallback";
import { UK_BOUNDING_BOX } from "@/lib/geo";

const fertilizeSchema = z.object({
  lat: z.coerce.number().min(UK_BOUNDING_BOX.minLat).max(UK_BOUNDING_BOX.maxLat),
  lng: z.coerce.number().min(UK_BOUNDING_BOX.minLng).max(UK_BOUNDING_BOX.maxLng),
  periodStart: z.string().date().optional(),
  periodEnd: z.string().date().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = fertilizeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { lat, lng } = parsed.data;
    const today = formatISODate(new Date());
    const periodStart = parsed.data.periodStart ?? today;
    const periodEnd = parsed.data.periodEnd ?? addDays(today, 7);

    const weather = await fallbackWeatherProvider.getSummary({
      lat,
      lng,
      from: periodStart,
      to: periodEnd,
      daily: true,
    });

    const recommendation = buildFertilizeRecommendation(weather);

    return NextResponse.json({
      recommendation,
      weather,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to generate fertilization recommendation",
      },
      { status: 400 }
    );
  }
}
