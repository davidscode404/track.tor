import { NextResponse } from "next/server";

import { addDays, formatISODate } from "@/lib/date";
import { weatherQuerySchema } from "@/lib/schemas";
import { openMeteoWeatherProvider } from "@/lib/weather";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const today = formatISODate(new Date());
    const hasLatLng = url.searchParams.has("lat") && url.searchParams.has("lng");
    const defaultFrom = hasLatLng ? addDays(today, -7) : addDays(today, -30);

    const parseResult = weatherQuerySchema.safeParse({
      lat: url.searchParams.get("lat") || undefined,
      lng: url.searchParams.get("lng") || undefined,
      from: url.searchParams.get("from") ?? defaultFrom,
      to: url.searchParams.get("to") ?? today,
      daily: url.searchParams.get("daily") || undefined,
    });

    if (!parseResult.success) {
      return NextResponse.json({ error: parseResult.error.flatten() }, { status: 400 });
    }

    const { lat, lng, from, to, daily } = parseResult.data;

    if (lat == null || lng == null) {
      return NextResponse.json(
        { error: "Both lat and lng are required" },
        { status: 400 }
      );
    }

    const summary = await openMeteoWeatherProvider.getSummary({
      lat,
      lng,
      from,
      to,
      daily: daily ?? true,
    });

    return NextResponse.json({ weather: summary });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch weather",
      },
      { status: 500 }
    );
  }
}
