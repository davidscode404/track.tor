import "server-only";

import { daysBetween } from "@/lib/date";
import type {
  DailyWeather,
  WeatherProvider,
  WeatherSummary,
} from "@/lib/types";

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

interface RainfallEntry {
  time: string;
  precipitation_mm: number;
  rain_mm: number;
  snowfall_cm: number;
}

interface TemperatureEntry {
  time: string;
  temperature_c: number;
  feels_like_c: number;
}

function getDate(time: string): string {
  return time.slice(0, 10);
}

class OpenMeteoWeatherProvider implements WeatherProvider {
  private readonly baseUrl = (
    process.env.NEXT_PUBLIC_BASE_API_URL ?? "http://127.0.0.1:8000"
  ).replace(/\/$/, "");

  async getSummary(input: {
    lat: number;
    lng: number;
    from: string;
    to: string;
    daily?: boolean;
  }): Promise<WeatherSummary> {
    const dayCount = Math.max(1, daysBetween(input.from, input.to));
    const sharedParams = new URLSearchParams({
      latitude: String(input.lat),
      longitude: String(input.lng),
      timezone: "Europe/London",
    });
    const rainfallParams = new URLSearchParams(sharedParams);
    rainfallParams.set("midday_only", "false");

    const [rainfallResponse, temperatureResponse] = await Promise.all([
      fetch(`${this.baseUrl}/rainfall?${rainfallParams.toString()}`, {
        cache: "no-store",
      }),
      fetch(`${this.baseUrl}/temperature?${sharedParams.toString()}`, {
        cache: "no-store",
      }),
    ]);

    if (!rainfallResponse.ok) {
      throw new Error(
        `Weather API rainfall error: ${rainfallResponse.status} ${rainfallResponse.statusText}`,
      );
    }
    if (!temperatureResponse.ok) {
      throw new Error(
        `Weather API temperature error: ${temperatureResponse.status} ${temperatureResponse.statusText}`,
      );
    }

    const rainfallEntries = (await rainfallResponse.json()) as RainfallEntry[];
    const temperatureEntries =
      (await temperatureResponse.json()) as TemperatureEntry[];

    const rainByDate = new Map<string, number>();
    const tempByDate = new Map<string, { sum: number; count: number }>();

    for (const entry of rainfallEntries) {
      const date = getDate(entry.time);
      if (date < input.from || date > input.to) continue;
      rainByDate.set(
        date,
        (rainByDate.get(date) ?? 0) + Number(entry.precipitation_mm ?? 0),
      );
    }

    let temperatureSum = 0;
    let temperatureCount = 0;
    for (const entry of temperatureEntries) {
      const date = getDate(entry.time);
      if (date < input.from || date > input.to) continue;
      const current = tempByDate.get(date) ?? { sum: 0, count: 0 };
      const temperature = Number(entry.temperature_c ?? 0);
      current.sum += temperature;
      current.count += 1;
      tempByDate.set(date, current);
      temperatureSum += temperature;
      temperatureCount += 1;
    }

    const allDates = new Set<string>([
      ...Array.from(rainByDate.keys()),
      ...Array.from(tempByDate.keys()),
    ]);
    const daily: DailyWeather[] = Array.from(allDates)
      .sort((a, b) => a.localeCompare(b))
      .map((date) => {
        const temp = tempByDate.get(date);
        return {
          date,
          rainMm: rainByDate.get(date) ?? 0,
          temperatureC: temp && temp.count > 0 ? temp.sum / temp.count : 0,
        };
      });

    const totalRainMm = daily.reduce((sum, day) => sum + day.rainMm, 0);
    const avgTemperatureC =
      temperatureCount > 0 ? temperatureSum / temperatureCount : 0;
    const expectedRain = dayCount * 3;
    const rainAnomaly = clamp(1 - totalRainMm / expectedRain);
    const dryIndex = clamp(rainAnomaly);
    const drySeason = dryIndex >= 0.6 || totalRainMm < dayCount * 1.5;

    return {
      source: "open-meteo",
      periodStart: input.from,
      periodEnd: input.to,
      rainMm: totalRainMm,
      avgTemperatureC,
      avgWindMps: 5,
      dryIndex,
      drySeason,
      rainAnomaly,
      windStress: 0.4,
      daily:
        input.daily && dayCount <= 14 && daily.length > 0 ? daily : undefined,
      rawPayload: {
        lat: input.lat,
        lng: input.lng,
        rainfallEntries,
        temperatureEntries,
      },
      note: "Weather data from FastAPI rainfall/temperature endpoints.",
    };
  }
}

export const openMeteoWeatherProvider = new OpenMeteoWeatherProvider();
