import { NextResponse } from "next/server";

import { addDays, formatISODate } from "@/lib/date";
import { buildPlan } from "@/lib/fertilize";
import { z } from "zod";
import { openMeteoWeatherProvider } from "@/lib/weather";
import { UK_BOUNDING_BOX } from "@/lib/geo";

const fertilizeSchema = z.object({
  lat: z.coerce.number().min(UK_BOUNDING_BOX.minLat).max(UK_BOUNDING_BOX.maxLat),
  lng: z.coerce.number().min(UK_BOUNDING_BOX.minLng).max(UK_BOUNDING_BOX.maxLng),
  crop: z.enum(["lettuce", "onion", "potato"]).default("lettuce"),
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

    const { lat, lng, crop } = parsed.data;
    const today = formatISODate(new Date());
    const periodStart = parsed.data.periodStart ?? today;
    const periodEnd = parsed.data.periodEnd ?? addDays(today, 14);

    const weather = await openMeteoWeatherProvider.getSummary({
      lat,
      lng,
      from: periodStart,
      to: periodEnd,
      daily: true,
    });

    if (!weather.daily || weather.daily.length === 0) {
      return NextResponse.json(
        { error: "No daily weather data available for the selected period." },
        { status: 400 },
      );
    }

    const plan = buildPlan(weather.daily, crop);

    return NextResponse.json({ plan, weather });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to generate fertilization plan",
      },
      { status: 400 },
    );
  }
}
