"use client";

import { useState } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  MinusCircle,
  CloudRain,
  Thermometer,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

import type {
  FertilizeDayOutlook,
  FertilizeRecommendation as FertilizeRecommendationType,
  FertilizeVerdict,
} from "@/lib/fertilize";
import type { WeatherSummary } from "@/lib/types";

interface RecommendationPanelProps {
  recommendation: FertilizeRecommendationType;
  weather?: WeatherSummary | null;
}

const dayFormatter = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  timeZone: "UTC",
});

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

const verdictConfig: Record<
  FertilizeVerdict,
  { label: string; bg: string; text: string; border: string; icon: typeof CheckCircle2 }
> = {
  good: {
    label: "Good to fertilize",
    bg: "bg-emerald-500/20",
    text: "text-emerald-300",
    border: "border-emerald-500/30",
    icon: CheckCircle2,
  },
  wait: {
    label: "Wait for rain",
    bg: "bg-amber-500/20",
    text: "text-amber-300",
    border: "border-amber-500/30",
    icon: AlertTriangle,
  },
  avoid: {
    label: "Avoid fertilizing",
    bg: "bg-red-500/20",
    text: "text-red-300",
    border: "border-red-500/30",
    icon: XCircle,
  },
  marginal: {
    label: "Marginal conditions",
    bg: "bg-zinc-500/20",
    text: "text-zinc-300",
    border: "border-zinc-500/30",
    icon: MinusCircle,
  },
};

const verdictDotColor: Record<FertilizeVerdict, string> = {
  good: "bg-emerald-400",
  wait: "bg-amber-400",
  avoid: "bg-red-400",
  marginal: "bg-zinc-400",
};

export function RecommendationPanel({
  recommendation,
  weather,
}: RecommendationPanelProps) {
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [showWeather, setShowWeather] = useState(false);
  const cfg = verdictConfig[recommendation.verdict];
  const Icon = cfg.icon;

  return (
    <div className="px-5 py-4">
      <div
        className={`rounded-xl border ${cfg.border} ${cfg.bg} p-4`}
      >
        <div className="flex items-center gap-3">
          <Icon className={`size-6 ${cfg.text}`} />
          <span className={`text-lg font-bold ${cfg.text}`}>{cfg.label}</span>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-white/70" style={{ fontFamily: "var(--font-display)" }}>
          {recommendation.reason}
        </p>
      </div>

      {recommendation.outlook.length > 0 && (
        <div className="mt-5">
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-white/30">
            {recommendation.outlook.length}-day outlook
          </p>
          <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 scrollbar-none">
            {recommendation.outlook.map((day) => {
              const d = new Date(day.date + "T12:00:00Z");
              const isExpanded = expandedDay === day.date;
              return (
                <button
                  key={day.date}
                  onClick={() =>
                    setExpandedDay(isExpanded ? null : day.date)
                  }
                  className={`flex min-w-18 shrink-0 flex-col items-center rounded-xl border px-3 py-2.5 transition-all ${
                    isExpanded
                      ? "border-white/20 bg-white/10"
                      : "border-white/5 bg-white/3 hover:bg-white/6"
                  }`}
                >
                  <span className="text-[10px] font-semibold uppercase text-white/40">
                    {dayFormatter.format(d)}
                  </span>
                  <span className="text-[10px] text-white/25">
                    {dateFormatter.format(d)}
                  </span>
                  <div
                    className={`mt-2 size-3 rounded-full ${verdictDotColor[day.verdict]}`}
                  />
                </button>
              );
            })}
          </div>

          {expandedDay && (
            <ExpandedDayDetail
              day={recommendation.outlook.find(
                (d) => d.date === expandedDay
              )!}
            />
          )}
        </div>
      )}

      {weather && (
        <div className="mt-4 border-t border-white/10 pt-3">
          <button
            onClick={() => setShowWeather((v) => !v)}
            className="flex w-full items-center justify-between text-xs text-white/30 transition-colors hover:text-white/50"
          >
            <span>Weather details</span>
            {showWeather ? (
              <ChevronUp className="size-3.5" />
            ) : (
              <ChevronDown className="size-3.5" />
            )}
          </button>
          {showWeather && (
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <CloudRain className="size-3.5 text-sky-400/60" />
                <span className="font-mono text-sm text-white/70">
                  {weather.rainMm.toFixed(1)} mm
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Thermometer className="size-3.5 text-amber-400/60" />
                <span className="font-mono text-sm text-white/70">
                  {weather.avgTemperatureC.toFixed(1)} &deg;C
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ExpandedDayDetail({ day }: { day: FertilizeDayOutlook }) {
  const cfg = verdictConfig[day.verdict];
  const Icon = cfg.icon;
  return (
    <div className="mt-2 rounded-lg border border-white/10 bg-white/5 p-3 animate-slide-up">
      <div className="flex items-center gap-2">
        <Icon className={`size-4 ${cfg.text}`} />
        <span className={`text-sm font-medium ${cfg.text}`}>{cfg.label}</span>
      </div>
      <p className="mt-1.5 text-xs leading-relaxed text-white/50">{day.reason}</p>
      <div className="mt-2 flex gap-3 text-xs text-white/30">
        <span>{day.rainMm.toFixed(1)}mm rain</span>
        <span>{day.temperatureC.toFixed(1)}&deg;C temp</span>
      </div>
    </div>
  );
}
