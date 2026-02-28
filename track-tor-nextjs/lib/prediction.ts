import { addMonths, toMonthStart } from "@/lib/date";
import type {
  Farm,
  MonthlyRecord,
  PredictionDriver,
  PredictionInputFeatures,
  PredictionResult,
  WeatherSummary,
} from "@/lib/types";

function clamp(value: number, min = -2, max = 2): number {
  return Math.min(max, Math.max(min, value));
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function getRecentRecords(records: MonthlyRecord[]): MonthlyRecord[] {
  return [...records]
    .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())
    .slice(-3);
}

function calculateFeatures(input: {
  farm: Farm;
  records: MonthlyRecord[];
  weather: WeatherSummary;
}): PredictionInputFeatures {
  const recent = getRecentRecords(input.records);
  const latest = recent[recent.length - 1];

  const avgCost3m = average(recent.map((record) => record.actualTotalCostUsd));
  const avgYield3m = average(recent.map((record) => record.expectedYieldTons));

  const fertPerHaSeries = recent.map((record) => record.fertilizerKg / input.farm.areaHectares);
  const avgFertPerHa = average(fertPerHaSeries);
  const latestFertPerHa = latest.fertilizerKg / input.farm.areaHectares;
  const fertIntensity = avgFertPerHa > 0 ? latestFertPerHa / avgFertPerHa : 1;

  const yieldTrend = avgYield3m > 0 ? (latest.expectedYieldTons - avgYield3m) / avgYield3m : 0;

  const costTrendBase = recent.length >= 2 ? recent[recent.length - 2].actualTotalCostUsd : avgCost3m;
  const recentCostTrend = costTrendBase > 0 ? (latest.actualTotalCostUsd - costTrendBase) / costTrendBase : 0;

  return {
    avgCost3m,
    fertIntensity,
    yieldTrend,
    rainAnomaly: input.weather.rainAnomaly,
    windStress: input.weather.windStress,
    dryIndex: input.weather.dryIndex,
    recentCostTrend,
  };
}

function toDriver(key: string, label: string, contribution: number): PredictionDriver {
  return {
    key,
    label,
    contribution,
  };
}

function calculateBudgetPeriods(nextMonth: number, adjustment: number): PredictionResult["budgetByPeriod"] {
  const monthlyGrowth = 1 + adjustment * 0.25;
  const budgets = [1, 2, 3].map((periodIndex) => {
    let total = 0;
    for (let i = 0; i < periodIndex; i += 1) {
      total += nextMonth * Math.pow(monthlyGrowth, i);
    }
    return Math.max(0, total);
  });

  return {
    days30: budgets[0],
    days60: budgets[1],
    days90: budgets[2],
  };
}

export function buildPrediction(input: {
  farm: Farm;
  records: MonthlyRecord[];
  weather: WeatherSummary;
  targetMonth: string;
}): PredictionResult {
  if (input.records.length < 2) {
    throw new Error("At least 2 monthly records are required for prediction");
  }

  const sorted = [...input.records].sort(
    (a, b) => new Date(a.month).getTime() - new Date(b.month).getTime(),
  );
  const lastMonthRecord = sorted[sorted.length - 1];

  const features = calculateFeatures({
    farm: input.farm,
    records: sorted,
    weather: input.weather,
  });

  const fertContribution = 0.3 * (features.fertIntensity - 1);
  const yieldContribution = 0.2 * -features.yieldTrend;
  const dryContribution = 0.25 * features.dryIndex;
  const windContribution = 0.1 * features.windStress;
  const trendContribution = 0.15 * features.recentCostTrend;

  const adjustment = clamp(
    fertContribution + yieldContribution + dryContribution + windContribution + trendContribution,
    -0.75,
    1.5,
  );

  const nextMonthCost = Math.max(0, features.avgCost3m * (1 + adjustment));
  const uncertainty = Math.min(0.4, Math.max(0.05, 0.08 + 0.12 * features.dryIndex));

  const optimisticCost = Math.max(0, nextMonthCost * (1 - uncertainty));
  const pessimisticCost = Math.max(0, nextMonthCost * (1 + uncertainty));

  const deltaVsLastMonthPct =
    lastMonthRecord.actualTotalCostUsd > 0
      ? ((nextMonthCost - lastMonthRecord.actualTotalCostUsd) / lastMonthRecord.actualTotalCostUsd) * 100
      : 0;

  const drivers = [
    toDriver("fertilizer", "Fertilizer intensity", fertContribution),
    toDriver("yield", "Yield trend", yieldContribution),
    toDriver("dryness", "Dryness pressure", dryContribution),
    toDriver("wind", "Wind stress", windContribution),
    toDriver("costTrend", "Recent cost trend", trendContribution),
  ].sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));

  return {
    targetMonth: toMonthStart(input.targetMonth),
    baseCostUsd: nextMonthCost,
    optimisticCostUsd: optimisticCost,
    pessimisticCostUsd: pessimisticCost,
    deltaVsLastMonthPct,
    drySeason: input.weather.drySeason,
    drivers,
    budgetByPeriod: calculateBudgetPeriods(nextMonthCost, adjustment),
    uncertainty,
  };
}

export function getDefaultTargetMonth(): string {
  return addMonths(toMonthStart(new Date()), 1);
}
