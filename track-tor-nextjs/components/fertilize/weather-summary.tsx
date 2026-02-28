"use client";

import { CloudRain, Thermometer } from "lucide-react";

import type { DailyWeather, WeatherSummary } from "@/lib/types";

interface WeatherPanelProps {
  weather: WeatherSummary;
  periodDays?: 7 | 14;
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

export function WeatherPanel({ weather, periodDays = 7 }: WeatherPanelProps) {
  const dayCount = periodDays;
  return (
    <div className="px-5 py-4">
      <p className="mb-3 text-[11px] font-medium uppercase tracking-widest text-white/30">
        Summary for next {dayCount} days
      </p>
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
          <div className="flex items-center gap-2 text-white/40">
            <CloudRain className="size-4" />
            <span className="text-xs font-medium uppercase tracking-wider">
              Total rainfall
            </span>
          </div>
          <p className="mt-1.5 font-mono text-3xl font-bold text-white tabular-nums">
            {weather.rainMm.toFixed(1)}
            <span className="ml-1 text-base font-normal text-white/50">mm</span>
          </p>
          <p className="mt-1 text-[10px] text-white/30">
            Sum of all {dayCount} days below
          </p>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
          <div className="flex items-center gap-2 text-white/40">
            <Thermometer className="size-4" />
            <span className="text-xs font-medium uppercase tracking-wider">
              Avg. temperature
            </span>
          </div>
          <p className="mt-1.5 font-mono text-3xl font-bold text-white tabular-nums">
            {weather.avgTemperatureC.toFixed(1)}
            <span className="ml-1 text-base font-normal text-white/50">
              &deg;C
            </span>
          </p>
          <p className="mt-1 text-[10px] text-white/30">
            Average across {dayCount} days
          </p>
        </div>
      </div>

      {weather.daily && weather.daily.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-white/30">
            Daily values (per day)
          </p>
          <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 scrollbar-none">
            {weather.daily.map((day) => (
              <DayCard key={day.date} day={day} />
            ))}
          </div>
        </div>
      )}

      {weather.note && (
        <p className="mt-3 text-xs text-white/25">{weather.note}</p>
      )}
    </div>
  );
}

function DayCard({ day }: { day: DailyWeather }) {
  const d = new Date(day.date + "T12:00:00Z");
  return (
    <div className="flex min-w-24 shrink-0 flex-col items-center rounded-xl border border-white/10 bg-white/5 px-3 py-3">
      <span className="text-[11px] font-semibold uppercase text-white/50">
        {dayFormatter.format(d)}
      </span>
      <span className="text-[10px] text-white/30">
        {dateFormatter.format(d)}
      </span>
      <div className="mt-2 flex flex-col items-center gap-1">
        <span className="flex items-center gap-1 text-sm font-medium text-sky-300 tabular-nums">
          <CloudRain className="size-3" />
          {day.rainMm.toFixed(1)}
          <span className="text-[10px] font-normal text-white/40">mm</span>
        </span>
        <span className="flex items-center gap-1 text-sm font-medium text-amber-300 tabular-nums">
          <Thermometer className="size-3" />
          {day.temperatureC.toFixed(1)}
          <span className="text-[10px] font-normal text-white/40">&deg;C</span>
        </span>
      </div>
    </div>
  );
}
