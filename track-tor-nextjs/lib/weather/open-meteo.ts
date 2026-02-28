import "server-only";

import { daysBetween } from "@/lib/date";
import type { DailyWeather, WeatherProvider, WeatherSummary } from "@/lib/types";

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

interface OpenMeteoDailyResponse {
  daily?: {
    time?: string[];
    precipitation_sum?: (number | null)[];
    sunshine_duration?: (number | null)[];
  };
}

class OpenMeteoWeatherProvider implements WeatherProvider {
  private readonly baseUrl = "https://api.open-meteo.com/v1/forecast";

  async getSummary(input: {
    lat: number;
    lng: number;
    from: string;
    to: string;
    daily?: boolean;
  }): Promise<WeatherSummary> {
    const dayCount = daysBetween(input.from, input.to);
    const forecastDays = Math.min(16, Math.max(1, dayCount + 1));

    const params = new URLSearchParams({
      latitude: String(input.lat),
      longitude: String(input.lng),
      daily: "precipitation_sum,sunshine_duration",
      timezone: "Europe/London",
      forecast_days: String(forecastDays),
    });

    const url = `${this.baseUrl}?${params.toString()}`;
    const response = await fetch(url, { next: { revalidate: 3600 } });

    if (!response.ok) {
      throw new Error(`Open-Meteo API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as OpenMeteoDailyResponse;
    const dailyData = data.daily;

    if (
      !dailyData?.time?.length ||
      !dailyData.precipitation_sum ||
      !dailyData.sunshine_duration
    ) {
      throw new Error("Invalid Open-Meteo response: missing daily data");
    }

    const fromTime = new Date(input.from).getTime();
    const toTime = new Date(input.to).getTime();

    const daily: DailyWeather[] = [];
    let totalRainMm = 0;
    let totalSunSeconds = 0;

    for (let i = 0; i < dailyData.time.length; i++) {
      const dateStr = dailyData.time[i];
      if (!dateStr) continue;

      const dateTime = new Date(dateStr + "T12:00:00Z").getTime();
      if (dateTime < fromTime || dateTime > toTime) continue;

      const rainMm = dailyData.precipitation_sum[i] ?? 0;
      const sunSeconds = dailyData.sunshine_duration[i] ?? 0;
      const sunHours = sunSeconds / 3600;

      totalRainMm += rainMm;
      totalSunSeconds += sunSeconds;

      if (input.daily && dayCount <= 14) {
        daily.push({ date: dateStr, rainMm, sunHours });
      }
    }

    const sunHours = totalSunSeconds / 3600;
    const expectedRain = dayCount * 3;
    const rainAnomaly = clamp(1 - totalRainMm / expectedRain);
    const dryIndex = clamp(rainAnomaly);
    const drySeason = dryIndex >= 0.6 || totalRainMm < dayCount * 1.5;

    return {
      source: "open-meteo",
      periodStart: input.from,
      periodEnd: input.to,
      rainMm: totalRainMm,
      sunHours,
      avgWindMps: 5,
      dryIndex,
      drySeason,
      rainAnomaly,
      windStress: 0.4,
      daily: daily.length > 0 ? daily : undefined,
      rawPayload: { lat: input.lat, lng: input.lng },
      note: "Weather data from Open-Meteo.com.",
    };
  }
}

export const openMeteoWeatherProvider = new OpenMeteoWeatherProvider();
