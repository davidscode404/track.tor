import { addDays } from "@/lib/date";
import type { WeatherSummary } from "@/lib/types";

export type FertilizeVerdict = "good" | "wait" | "avoid" | "marginal";

export interface FertilizeDayOutlook {
  date: string;
  verdict: FertilizeVerdict;
  reason: string;
  rainMm: number;
  temperatureC: number;
}

export interface FertilizeRecommendation {
  verdict: FertilizeVerdict;
  reason: string;
  outlook: FertilizeDayOutlook[];
}

const RAIN_IDEAL_MIN = 2;
const RAIN_IDEAL_MAX = 15;
const RAIN_TOO_DRY = 1;
const RAIN_AVOID = 25;
const TEMP_FAVOURABLE_MIN = 10;
const TEMP_FAVOURABLE_MAX = 24;
const TEMP_TOO_COLD = 5;
const TEMP_TOO_HOT = 30;
const DRY_INDEX_WAIT = 0.6;

function getDayVerdict(rainMm: number, temperatureC: number, dryIndex?: number): FertilizeVerdict {
  if (rainMm >= RAIN_AVOID) {
    return "avoid";
  }
  if (temperatureC <= TEMP_TOO_COLD) {
    return "wait";
  }
  if (temperatureC >= TEMP_TOO_HOT) {
    return "avoid";
  }
  if (rainMm < RAIN_TOO_DRY || (dryIndex != null && dryIndex >= DRY_INDEX_WAIT)) {
    return "wait";
  }
  if (
    rainMm >= RAIN_IDEAL_MIN &&
    rainMm <= RAIN_IDEAL_MAX &&
    temperatureC >= TEMP_FAVOURABLE_MIN &&
    temperatureC <= TEMP_FAVOURABLE_MAX
  ) {
    return "good";
  }
  if (temperatureC < TEMP_FAVOURABLE_MIN || temperatureC > TEMP_FAVOURABLE_MAX) {
    return "marginal";
  }
  if (rainMm >= RAIN_IDEAL_MIN && rainMm <= RAIN_IDEAL_MAX) {
    return "good";
  }
  return "marginal";
}

function getDayReason(verdict: FertilizeVerdict, rainMm: number, temperatureC: number): string {
  switch (verdict) {
    case "good":
      return `Good conditions: ${rainMm.toFixed(1)}mm rain, ${temperatureC.toFixed(1)}°C.`;
    case "wait":
      if (rainMm < RAIN_TOO_DRY) {
        return `Too dry (${rainMm.toFixed(1)}mm). Wait for rain to avoid burn.`;
      }
      if (temperatureC <= TEMP_TOO_COLD) {
        return `Too cold (${temperatureC.toFixed(1)}°C). Wait for warmer conditions.`;
      }
      return "Dry conditions. Better to wait for moisture.";
    case "avoid":
      if (temperatureC >= TEMP_TOO_HOT) {
        return `Very hot (${temperatureC.toFixed(1)}°C). High stress and volatility risk.`;
      }
      return `Heavy rain expected (${rainMm.toFixed(1)}mm). Risk of runoff.`;
    case "marginal":
      return `Rain (${rainMm.toFixed(1)}mm) or temperature (${temperatureC.toFixed(1)}°C) outside ideal range.`;
    default:
      return "";
  }
}

function getOverallReason(verdict: FertilizeVerdict, weather: WeatherSummary): string {
  const { rainMm, avgTemperatureC, dryIndex, drySeason } = weather;
  switch (verdict) {
    case "good":
      return `Conditions favourable: moderate rain (${rainMm.toFixed(0)}mm) and temperature (${avgTemperatureC.toFixed(1)}°C).`;
    case "wait":
      if (drySeason || dryIndex >= DRY_INDEX_WAIT) {
        return "Soil too dry. Fertilizing now risks crop burn — wait for rain.";
      }
      if (rainMm < RAIN_TOO_DRY) {
        return "Insufficient moisture. Delay until rain is forecast.";
      }
      if (avgTemperatureC <= TEMP_TOO_COLD) {
        return "Temperatures are too low. Wait for warmer conditions.";
      }
      return "Conditions suggest waiting for better moisture.";
    case "avoid":
      if (avgTemperatureC >= TEMP_TOO_HOT) {
        return `Very high temperature (${avgTemperatureC.toFixed(1)}°C). Avoid fertilizing in this heat.`;
      }
      return `Heavy rain (${rainMm.toFixed(0)}mm) expected. Risk of runoff and leaching.`;
    case "marginal":
      return `Mixed conditions: ${rainMm.toFixed(0)}mm rain, ${avgTemperatureC.toFixed(1)}°C. Consider waiting for a clearer window.`;
    default:
      return "";
  }
}

export function buildFertilizeRecommendation(weather: WeatherSummary): FertilizeRecommendation {
  const outlook: FertilizeDayOutlook[] = [];

  if (weather.daily && weather.daily.length > 0) {
    for (const day of weather.daily) {
      const verdict = getDayVerdict(day.rainMm, day.temperatureC);
      outlook.push({
        date: day.date,
        verdict,
        reason: getDayReason(verdict, day.rainMm, day.temperatureC),
        rainMm: day.rainMm,
        temperatureC: day.temperatureC,
      });
    }
  } else {
    const dayCount = Math.ceil(
      (new Date(weather.periodEnd).getTime() - new Date(weather.periodStart).getTime()) /
        86_400_000
    );
    const rainPerDay = weather.rainMm / Math.max(1, dayCount);
    const temperaturePerDay = weather.avgTemperatureC;
    const verdict = getDayVerdict(rainPerDay, temperaturePerDay, weather.dryIndex);
    for (let i = 0; i < 7; i++) {
      const date = addDays(weather.periodStart, i);
      outlook.push({
        date,
        verdict,
        reason: getDayReason(verdict, rainPerDay, temperaturePerDay),
        rainMm: rainPerDay,
        temperatureC: temperaturePerDay,
      });
    }
  }

  const firstDay = outlook[0];
  const overallVerdict = firstDay
    ? getDayVerdict(firstDay.rainMm, firstDay.temperatureC, weather.dryIndex)
    : getDayVerdict(
        weather.rainMm / 7,
        weather.avgTemperatureC,
        weather.dryIndex
      );

  return {
    verdict: overallVerdict,
    reason: getOverallReason(overallVerdict, weather),
    outlook,
  };
}
