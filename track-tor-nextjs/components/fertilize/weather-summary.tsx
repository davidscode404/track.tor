"use client";

import { CloudRain, Sun } from "lucide-react";

import type { DailyWeather, WeatherSummary } from "@/lib/types";

interface WeatherPanelProps {
  weather: WeatherSummary;
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

export function WeatherPanel({ weather }: WeatherPanelProps) {
  return (
    <div className="px-5 py-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="flex items-center gap-2 text-white/40">
            <CloudRain className="size-4" />
            <span className="text-xs font-medium uppercase tracking-wider">
              Rainfall
            </span>
          </div>
          <p className="mt-1 font-mono text-3xl font-bold text-white">
            {weather.rainMm.toFixed(1)}
            <span className="ml-1 text-base font-normal text-white/40">mm</span>
          </p>
        </div>
        <div>
          <div className="flex items-center gap-2 text-white/40">
            <Sun className="size-4" />
            <span className="text-xs font-medium uppercase tracking-wider">
              Sunshine
            </span>
          </div>
          <p className="mt-1 font-mono text-3xl font-bold text-white">
            {weather.sunHours.toFixed(1)}
            <span className="ml-1 text-base font-normal text-white/40">hrs</span>
          </p>
        </div>
      </div>

      {weather.daily && weather.daily.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-white/30">
            7-day breakdown
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
    <div className="flex min-w-22 shrink-0 flex-col items-center rounded-xl border border-white/10 bg-white/5 px-3 py-3">
      <span className="text-[11px] font-semibold uppercase text-white/50">
        {dayFormatter.format(d)}
      </span>
      <span className="text-[10px] text-white/30">
        {dateFormatter.format(d)}
      </span>
      <div className="mt-2 flex flex-col items-center gap-0.5">
        <span className="flex items-center gap-1 text-sm font-medium text-sky-300">
          <CloudRain className="size-3" />
          {day.rainMm.toFixed(1)}
        </span>
        <span className="flex items-center gap-1 text-sm font-medium text-amber-300">
          <Sun className="size-3" />
          {day.sunHours.toFixed(1)}
        </span>
      </div>
    </div>
  );
}
