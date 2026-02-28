import type {
  CropType,
  DailyWeather,
  DayPlan,
  FertStatus,
  PlannerResult,
} from "@/lib/types";

const RA = 25; // extraterrestrial radiation MJ/m²/day (annual average)

const CROP_KC: Record<CropType, number> = {
  lettuce: 1.0,
  onion: 1.05,
  potato: 1.15,
};

const CROP_DMAX: Record<CropType, number> = {
  lettuce: 12,
  onion: 15,
  potato: 20,
};

const CROP_LOSS_LIMIT: Record<CropType, number> = {
  lettuce: 20,
  onion: 25,
  potato: 25,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Step 1: Hargreaves reference evapotranspiration (mm/day) */
function computeETo(tMin: number, tMax: number): number {
  const tMean = (tMax + tMin) / 2;
  const range = Math.max(0, tMax - tMin);
  return 0.0023 * (tMean + 17.8) * Math.sqrt(range) * RA;
}

/** Step 2: Crop evapotranspiration */
function computeETc(eto: number, crop: CropType): number {
  return CROP_KC[crop] * eto;
}

/** Step 3: Effective rainfall */
function effectiveRainfall(rain: number): number {
  if (rain < 5) return 0.5 * rain;
  if (rain <= 25) return 0.9 * rain;
  return 25;
}

/**
 * Build a 14-day irrigation & fertilization plan.
 *
 * Implements:
 * - Step 1: ETo (Hargreaves)
 * - Step 2: ETc (crop Kc)
 * - Step 3: Effective rainfall
 * - Step 4: Water deficit checkbook
 * - Step 5: Irrigation triggers
 * - Step 6: Fertilisation planner (Rules A-E)
 */
export function buildPlan(
  daily: DailyWeather[],
  crop: CropType,
): PlannerResult {
  const dmax = CROP_DMAX[crop];
  const lossLimit = CROP_LOSS_LIMIT[crop];
  const days: DayPlan[] = [];
  let deficit = 0;

  // Steps 1-5: compute daily ETo, ETc, effective rain, deficit, irrigation
  for (let i = 0; i < daily.length; i++) {
    const d = daily[i];
    const eto = computeETo(d.minTemperatureC, d.maxTemperatureC);
    const etc = computeETc(eto, crop);
    const reff = effectiveRainfall(d.rainMm);

    deficit = Math.max(0, deficit + etc - reff);

    let irrigate = false;
    let irrigationMm = 0;
    if (deficit >= dmax) {
      irrigate = true;
      const dTarget = 0.3 * dmax;
      irrigationMm = clamp(deficit - dTarget, 7, 30);
      deficit = Math.max(0, deficit - irrigationMm);
    }

    days.push({
      date: d.date,
      eto: Math.round(eto * 100) / 100,
      etc: Math.round(etc * 100) / 100,
      effectiveRain: Math.round(reff * 100) / 100,
      deficit: Math.round(deficit * 100) / 100,
      irrigate,
      irrigationMm: Math.round(irrigationMm * 100) / 100,
      fertStatus: "none",
      fertReason: "",
      fertIrrigationMm: 0,
      rainMm: d.rainMm,
      temperatureC: d.temperatureC,
      maxTemperatureC: d.maxTemperatureC,
    });
  }

  // Step 6: Fertilisation planner (Rules A-E)
  // Only plan for the first 14 days (d=0..13)
  const planDays = Math.min(days.length, 14);

  for (let d = 0; d < planDays; d++) {
    const rain = days.map((p) => p.rainMm);

    // INC[d] = max(R[d], R[d+1]) — rain within 48h for incorporation
    const inc =
      Math.max(rain[d] ?? 0, rain[d + 1] ?? 0);

    // LOSS[d] = sum(R[d..d+2]) — how wet the 72h after application
    const loss =
      (rain[d] ?? 0) + (rain[d + 1] ?? 0) + (rain[d + 2] ?? 0);

    // HEAVY[d] = max(R[d..d+2]) — single-day downpour risk
    const heavy =
      Math.max(rain[d] ?? 0, rain[d + 1] ?? 0, rain[d + 2] ?? 0);

    const hot = days[d].maxTemperatureC >= 25;

    // Rule A: Hard rejection filters
    if (heavy >= 20) {
      days[d].fertStatus = "rejected";
      days[d].fertReason = `Heavy rain risk (${heavy.toFixed(0)}mm peak in 72h). Runoff would wash away fertilizer.`;
      continue;
    }
    if (loss >= lossLimit) {
      days[d].fertStatus = "rejected";
      days[d].fertReason = `Too wet (${loss.toFixed(0)}mm over 72h). Leaching risk too high.`;
      continue;
    }

    // Rule B: Prefer rain-incorporated days
    if (inc >= 10) {
      days[d].fertStatus = "good";
      days[d].fertReason = hot
        ? `Good rain incorporation (${inc.toFixed(0)}mm in 48h) but hot (${days[d].maxTemperatureC.toFixed(0)}°C). Prefer a cooler day if available.`
        : `Good conditions — ${inc.toFixed(0)}mm rain expected within 48h to incorporate fertilizer.`;
      continue;
    }

    // If not enough rain for incorporation, mark as "none" for now
    days[d].fertStatus = "none";
    days[d].fertReason = `Insufficient rain for natural incorporation (${inc.toFixed(0)}mm in 48h).`;
  }

  // Rule C: If a "good" day is hot, prefer a cooler alternative
  const goodDays = days
    .slice(0, planDays)
    .filter((p) => p.fertStatus === "good");
  const coolGood = goodDays.filter((p) => p.maxTemperatureC < 25);
  const hotGood = goodDays.filter((p) => p.maxTemperatureC >= 25);

  if (coolGood.length > 0 && hotGood.length > 0) {
    for (const hd of hotGood) {
      hd.fertReason = `Good rain incorporation but hot (${hd.maxTemperatureC.toFixed(0)}°C). Cooler alternative available — prefer ${coolGood[0].date}.`;
    }
  }

  // Rule D: If no "good" days, pick earliest non-rejected and set irrigate-in
  if (goodDays.length === 0) {
    const candidate = days
      .slice(0, planDays)
      .find((p) => p.fertStatus !== "rejected");
    if (candidate) {
      const rain = days.map((p) => p.rainMm);
      const idx = days.indexOf(candidate);
      const inc = Math.max(rain[idx] ?? 0, rain[idx + 1] ?? 0);
      const fertIrrigation = Math.max(0, 10 - inc);
      candidate.fertStatus = "irrigate-in";
      candidate.fertIrrigationMm = Math.round(fertIrrigation * 100) / 100;
      candidate.fertReason = fertIrrigation > 0
        ? `No natural rain window. Apply ${fertIrrigation.toFixed(0)}mm irrigation within 24h to incorporate fertilizer.`
        : "No ideal rain window, but enough moisture for incorporation.";
    } else {
      // Rule E: all days rejected
    }
  }

  // Determine best day and summary
  let bestFertDay: DayPlan | null = null;
  const bestGood = coolGood[0] ?? goodDays[0];
  const irrigateIn = days.find((p) => p.fertStatus === "irrigate-in");

  if (bestGood) {
    bestFertDay = bestGood;
  } else if (irrigateIn) {
    bestFertDay = irrigateIn;
  }

  let summary: string;
  if (bestFertDay) {
    const dateLabel = formatDateLabel(bestFertDay.date);
    if (bestFertDay.fertStatus === "good") {
      summary = `Best day to fertilize: ${dateLabel}. Rain will incorporate the fertilizer naturally.`;
    } else {
      summary = `Fertilize on ${dateLabel} with ${bestFertDay.fertIrrigationMm.toFixed(0)}mm irrigation to incorporate.`;
    }
  } else {
    summary =
      "No safe fertilisation window in the next 14 days. Consider splitting the dose or delaying.";
  }

  return { crop, days, bestFertDay, summary };
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00Z");
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}
