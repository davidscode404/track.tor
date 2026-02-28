import "server-only";

import { addDays, daysBetween } from "@/lib/date";
import type { DailyWeather, WeatherProvider, WeatherSummary } from "@/lib/types";

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

function getUkSeasonality(month: number): { rainMmPerDay: number; windMps: number; sunHoursPerDay: number } {
  if ([12, 1, 2].includes(month)) {
    return { rainMmPerDay: 3.7, windMps: 7.4, sunHoursPerDay: 1.5 };
  }

  if ([3, 4, 5].includes(month)) {
    return { rainMmPerDay: 2.5, windMps: 6.1, sunHoursPerDay: 4.2 };
  }

  if ([6, 7, 8].includes(month)) {
    return { rainMmPerDay: 1.9, windMps: 4.9, sunHoursPerDay: 6.0 };
  }

  return { rainMmPerDay: 3.1, windMps: 6.6, sunHoursPerDay: 3.0 };
}

function buildDailyForecast(
  from: string,
  dayCount: number,
  lat: number,
  lng: number
): DailyWeather[] {
  const daily: DailyWeather[] = [];
  const latInfluence = clamp((lat - 50) / 10, 0, 1);
  const lngInfluence = clamp((Math.abs(lng) - 1) / 8, 0, 1);

  for (let i = 0; i < dayCount; i++) {
    const date = addDays(from, i);
    const month = new Date(date).getUTCMonth() + 1;
    const seasonal = getUkSeasonality(month);
    const dayVariation = 0.9 + (i % 5) * 0.05;

    const rainMm =
      dayVariation * (seasonal.rainMmPerDay + latInfluence * 0.6 - lngInfluence * 0.2);
    const sunHours = Math.max(0.5, Math.min(10, seasonal.sunHoursPerDay + latInfluence * 0.3 - lngInfluence * 0.1));

    daily.push({ date, rainMm, sunHours });
  }

  return daily;
}

class FallbackWeatherProvider implements WeatherProvider {
  async getSummary(input: {
    lat: number;
    lng: number;
    from: string;
    to: string;
    daily?: boolean;
  }): Promise<WeatherSummary> {
    const dayCount = daysBetween(input.from, input.to);
    const toMonth = new Date(input.to).getUTCMonth() + 1;

    const seasonal = getUkSeasonality(toMonth);
    const latInfluence = clamp((input.lat - 50) / 10, 0, 1);
    const lngInfluence = clamp((Math.abs(input.lng) - 1) / 8, 0, 1);

    const rainMm = Math.max(
      1,
      dayCount * (seasonal.rainMmPerDay + latInfluence * 0.6 - lngInfluence * 0.2)
    );
    const sunHours = dayCount * Math.max(
      0.5,
      seasonal.sunHoursPerDay + latInfluence * 0.3 - lngInfluence * 0.1
    );
    const avgWindMps = Math.max(1, seasonal.windMps + latInfluence * 0.4 + lngInfluence * 0.2);

    const expectedRain = dayCount * 3;
    const rainAnomaly = clamp(1 - rainMm / expectedRain);
    const windStress = clamp(avgWindMps / 12);
    const dryIndex = clamp(0.7 * rainAnomaly + 0.3 * windStress);

    const daily =
      input.daily && dayCount <= 14
        ? buildDailyForecast(input.from, dayCount, input.lat, input.lng)
        : undefined;

    return {
      source: "fallback",
      periodStart: input.from,
      periodEnd: input.to,
      rainMm,
      sunHours,
      avgWindMps,
      dryIndex,
      drySeason: dryIndex >= 0.6 || rainMm < dayCount * 1.5,
      rainAnomaly,
      windStress,
      daily,
      rawPayload: {
        model: "internal-uk-weather-v1",
        lat: input.lat,
        lng: input.lng,
      },
      note: "Using internal UK weather model (external weather API disabled).",
    };
  }
}

export const fallbackWeatherProvider = new FallbackWeatherProvider();
