import { addDays } from "@/lib/date";
import type { WeatherSummary } from "@/lib/types";

export type FertilizeVerdict = "good" | "wait" | "avoid" | "marginal";

export interface FertilizeDayOutlook {
  date: string;
  verdict: FertilizeVerdict;
  reason: string;
  rainMm: number;
  sunHours: number;
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
const SUN_FAVOURABLE_MIN = 3;
const SUN_FAVOURABLE_MAX = 8;
const SUN_MARGINAL = 1;
const DRY_INDEX_WAIT = 0.6;

function getDayVerdict(rainMm: number, sunHours: number, dryIndex?: number): FertilizeVerdict {
  if (rainMm >= RAIN_AVOID) {
    return "avoid";
  }
  if (rainMm < RAIN_TOO_DRY || (dryIndex != null && dryIndex >= DRY_INDEX_WAIT)) {
    return "wait";
  }
  if (
    rainMm >= RAIN_IDEAL_MIN &&
    rainMm <= RAIN_IDEAL_MAX &&
    sunHours >= SUN_FAVOURABLE_MIN &&
    sunHours <= SUN_FAVOURABLE_MAX
  ) {
    return "good";
  }
  if (sunHours < SUN_MARGINAL) {
    return "marginal";
  }
  if (rainMm >= RAIN_IDEAL_MIN && rainMm <= RAIN_IDEAL_MAX) {
    return "good";
  }
  return "marginal";
}

function getDayReason(verdict: FertilizeVerdict, rainMm: number, sunHours: number): string {
  switch (verdict) {
    case "good":
      return `Good conditions: ${rainMm.toFixed(1)}mm rain, ${sunHours.toFixed(1)}h sun.`;
    case "wait":
      if (rainMm < RAIN_TOO_DRY) {
        return `Too dry (${rainMm.toFixed(1)}mm). Wait for rain to avoid burn.`;
      }
      return "Dry conditions. Better to wait for moisture.";
    case "avoid":
      return `Heavy rain expected (${rainMm.toFixed(1)}mm). Risk of runoff.`;
    case "marginal":
      if (sunHours < SUN_MARGINAL) {
        return `Low sunshine (${sunHours.toFixed(1)}h). Marginal uptake.`;
      }
      return `Rain (${rainMm.toFixed(1)}mm) or sun (${sunHours.toFixed(1)}h) outside ideal range.`;
    default:
      return "";
  }
}

function getOverallReason(verdict: FertilizeVerdict, weather: WeatherSummary): string {
  const { rainMm, sunHours, dryIndex, drySeason } = weather;
  switch (verdict) {
    case "good":
      return `Conditions favourable: moderate rain (${rainMm.toFixed(0)}mm) and sun (${sunHours.toFixed(0)}h) support nutrient uptake.`;
    case "wait":
      if (drySeason || dryIndex >= DRY_INDEX_WAIT) {
        return "Soil too dry. Fertilizing now risks crop burn — wait for rain.";
      }
      if (rainMm < RAIN_TOO_DRY) {
        return "Insufficient moisture. Delay until rain is forecast.";
      }
      return "Conditions suggest waiting for better moisture.";
    case "avoid":
      return `Heavy rain (${rainMm.toFixed(0)}mm) expected. Risk of runoff and leaching.`;
    case "marginal":
      return `Mixed conditions: ${rainMm.toFixed(0)}mm rain, ${sunHours.toFixed(0)}h sun. Consider waiting for a clearer window.`;
    default:
      return "";
  }
}

export function buildFertilizeRecommendation(weather: WeatherSummary): FertilizeRecommendation {
  const outlook: FertilizeDayOutlook[] = [];

  if (weather.daily && weather.daily.length > 0) {
    for (const day of weather.daily) {
      const verdict = getDayVerdict(day.rainMm, day.sunHours);
      outlook.push({
        date: day.date,
        verdict,
        reason: getDayReason(verdict, day.rainMm, day.sunHours),
        rainMm: day.rainMm,
        sunHours: day.sunHours,
      });
    }
  } else {
    const dayCount = Math.ceil(
      (new Date(weather.periodEnd).getTime() - new Date(weather.periodStart).getTime()) /
        86_400_000
    );
    const rainPerDay = weather.rainMm / Math.max(1, dayCount);
    const sunPerDay = weather.sunHours / Math.max(1, dayCount);
    const verdict = getDayVerdict(rainPerDay, sunPerDay, weather.dryIndex);
    for (let i = 0; i < 7; i++) {
      const date = addDays(weather.periodStart, i);
      outlook.push({
        date,
        verdict,
        reason: getDayReason(verdict, rainPerDay, sunPerDay),
        rainMm: rainPerDay,
        sunHours: sunPerDay,
      });
    }
  }

  const firstDay = outlook[0];
  const overallVerdict = firstDay
    ? getDayVerdict(firstDay.rainMm, firstDay.sunHours, weather.dryIndex)
    : getDayVerdict(
        weather.rainMm / 7,
        weather.sunHours / 7,
        weather.dryIndex
      );

  return {
    verdict: overallVerdict,
    reason: getOverallReason(overallVerdict, weather),
    outlook,
  };
}
