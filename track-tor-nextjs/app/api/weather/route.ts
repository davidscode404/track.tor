import { NextResponse } from "next/server";

import { addDays, formatISODate } from "@/lib/date";
import { supabaseAdmin } from "@/lib/db";
import { weatherQuerySchema } from "@/lib/schemas";
import { fallbackWeatherProvider } from "@/lib/weather/fallback";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const today = formatISODate(new Date());
  const hasLatLng = url.searchParams.has("lat") && url.searchParams.has("lng");
  const defaultFrom = hasLatLng ? addDays(today, -7) : addDays(today, -30);

  const parseResult = weatherQuerySchema.safeParse({
    farmId: url.searchParams.get("farmId") || undefined,
    lat: url.searchParams.get("lat") || undefined,
    lng: url.searchParams.get("lng") || undefined,
    from: url.searchParams.get("from") ?? defaultFrom,
    to: url.searchParams.get("to") ?? today,
    daily: url.searchParams.get("daily") || undefined,
  });

  if (!parseResult.success) {
    return NextResponse.json({ error: parseResult.error.flatten() }, { status: 400 });
  }

  const { farmId, lat, lng, from, to, daily } = parseResult.data;

  let targetLat: number;
  let targetLng: number;

  if (farmId) {
    const { data: farm, error: farmError } = await supabaseAdmin
      .from("farms")
      .select("id,centroid_lat,centroid_lng")
      .eq("id", farmId)
      .single();

    if (farmError || !farm) {
      return NextResponse.json({ error: farmError?.message ?? "Farm not found" }, { status: 404 });
    }

    targetLat = Number(farm.centroid_lat);
    targetLng = Number(farm.centroid_lng);
  } else if (lat != null && lng != null) {
    targetLat = lat;
    targetLng = lng;
  } else {
    return NextResponse.json(
      { error: "Either farmId or both lat and lng are required" },
      { status: 400 }
    );
  }

  const summary = await fallbackWeatherProvider.getSummary({
    lat: targetLat,
    lng: targetLng,
    from,
    to,
    daily: daily ?? true,
  });

  if (farmId) {
    await supabaseAdmin.from("weather_snapshots").upsert(
      {
        farm_id: farmId,
        period_start: from,
        period_end: to,
        rain_mm: summary.rainMm,
        avg_wind_mps: summary.avgWindMps,
        dry_index: summary.dryIndex,
        source: summary.source,
        raw_payload: summary.rawPayload,
      },
      {
        onConflict: "farm_id,period_start,period_end,source",
      },
    );
  }

  return NextResponse.json({ weather: summary });
}
