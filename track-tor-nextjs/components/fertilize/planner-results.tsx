"use client";

import { useState, useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Cell,
  ReferenceLine,
} from "recharts";
import {
  CheckCircle2,
  Droplets,
  Sprout,
  CloudRain,
  Thermometer,
  AlertTriangle,
} from "lucide-react";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { CropType, DayPlan, FertStatus, PlannerResult } from "@/lib/types";

const CROP_DMAX: Record<CropType, number> = {
  lettuce: 12,
  onion: 15,
  potato: 20,
};

interface PlannerPanelProps {
  plan: PlannerResult;
}

const CROP_LABELS: Record<string, string> = {
  lettuce: "Lettuce",
  onion: "Onion",
  potato: "Potato",
};

const dayFormatter = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  timeZone: "UTC",
});

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

const STATUS_CONFIG: Record<
  FertStatus,
  { dot: string; bg: string; text: string; label: string }
> = {
  good: {
    dot: "bg-emerald-400",
    bg: "bg-emerald-500/15",
    text: "text-emerald-300",
    label: "Fertilize",
  },
  rejected: {
    dot: "bg-red-400",
    bg: "bg-red-500/15",
    text: "text-red-300",
    label: "Avoid",
  },
  "irrigate-in": {
    dot: "bg-amber-400",
    bg: "bg-amber-500/15",
    text: "text-amber-300",
    label: "Irrigate-in",
  },
  none: {
    dot: "bg-zinc-500",
    bg: "bg-white/5",
    text: "text-zinc-400",
    label: "—",
  },
};

export function PlannerPanel({ plan }: PlannerPanelProps) {
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const maxDeficit = Math.max(...plan.days.map((d) => d.deficit), 1);

  const hasBest = plan.bestFertDay != null;
  const summaryBg = hasBest ? "bg-emerald-500/15 border-emerald-500/30" : "bg-red-500/15 border-red-500/30";
  const summaryText = hasBest ? "text-emerald-300" : "text-red-300";
  const SummaryIcon = hasBest ? CheckCircle2 : AlertTriangle;

  return (
    <div className="px-5 py-4">
      {/* Summary banner */}
      <div className={`rounded-xl border p-4 ${summaryBg}`}>
        <div className="flex items-start gap-3">
          <SummaryIcon className={`mt-0.5 size-5 shrink-0 ${summaryText}`} />
          <div className="min-w-0">
            <p className={`text-sm font-semibold leading-snug ${summaryText}`}>
              {plan.summary}
            </p>
            <p className="mt-1 text-xs text-white/60">
              {CROP_LABELS[plan.crop]} &middot; {plan.days.length}-day plan
            </p>
          </div>
        </div>
      </div>

      {/* Timeline strip */}
      <div className="mt-5">
        <p className="mb-2 text-[10px] font-medium uppercase tracking-widest text-white/55">
          Daily timeline
        </p>
        <div className="-mx-5 flex mt-4 gap-2 overflow-x-auto overflow-y-visible px-5 pb-3 scrollbar-none">
          {plan.days.map((day) => {
            const d = new Date(day.date + "T12:00:00Z");
            const cfg = STATUS_CONFIG[day.fertStatus];
            const isExpanded = expandedDay === day.date;
            const isBest = plan.bestFertDay?.date === day.date;

            return (
              <button
                key={day.date}
                onClick={() =>
                  setExpandedDay(isExpanded ? null : day.date)
                }
                className={`relative flex min-w-18 shrink-0 flex-col items-center rounded-xl border px-2.5 pt-2.5 pb-3 transition-all ${
                  isExpanded
                    ? "border-white/25 bg-white/10"
                    : isBest
                      ? `border-emerald-500/40 ${cfg.bg}`
                      : `border-white/5 ${cfg.bg} hover:border-white/15`
                }`}
              >
                <span className="text-[10px] font-semibold uppercase text-white/70">
                  {dayFormatter.format(d)}
                </span>
                <span className="text-[9px] text-white/50">
                  {dateFormatter.format(d)}
                </span>

                {/* Status dot + irrigation icon */}
                <div className="mt-2 flex items-center gap-1">
                  <div className={`size-2.5 rounded-full ${cfg.dot}`} />
                  {day.irrigate && (
                    <Droplets className="size-3 text-sky-400" />
                  )}
                </div>

                {/* Rain & deficit bars */}
                <div className="mt-2 flex w-full flex-col gap-1">
                  <div className="flex items-center gap-1">
                    <CloudRain className="size-2.5 text-sky-400" />
                    <span className="text-[9px] tabular-nums text-white/60">
                      {day.rainMm.toFixed(0)}mm
                    </span>
                  </div>
                  <div className="h-1 w-full overflow-hidden rounded-full bg-white/15">
                    <div
                      className="h-full rounded-full bg-amber-400/70 transition-all"
                      style={{
                        width: `${Math.min(100, (day.deficit / maxDeficit) * 100)}%`,
                      }}
                    />
                  </div>
                </div>

                {isBest && (
                  <div className="absolute  -bottom-1 -right-1 flex size-4 items-center justify-center rounded-full bg-emerald-500">
                    <Sprout className="size-2.5 text-white" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Expanded day detail */}
      {expandedDay && (
        <DayDetail
          day={plan.days.find((d) => d.date === expandedDay)!}
          isBest={plan.bestFertDay?.date === expandedDay}
        />
      )}

      {/* Water deficit chart */}
      <div className="mt-5">
        <p className="mb-2 text-[10px] font-medium uppercase tracking-widest text-white/55">
          Water deficit
        </p>
        <DeficitChart days={plan.days} crop={plan.crop} />
      </div>

      {/* Irrigation events */}
      <IrrigationSummary days={plan.days} />
    </div>
  );
}

function DayDetail({ day, isBest }: { day: DayPlan; isBest: boolean }) {
  const cfg = STATUS_CONFIG[day.fertStatus];
  const d = new Date(day.date + "T12:00:00Z");
  const label = d.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });

  return (
    <div className="mt-3 animate-slide-up rounded-xl border border-white/15 bg-white/8 p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-white/90">{label}</span>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${cfg.bg} ${cfg.text}`}>
          {cfg.label}
          {isBest ? " — Best" : ""}
        </span>
      </div>

      <p className="mt-2 text-xs leading-relaxed text-white/65">
        {day.fertReason}
      </p>

      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-4">
        <Stat icon={CloudRain} iconColor="text-sky-400" label="Rain" value={`${day.rainMm.toFixed(1)}mm`} />
        <Stat icon={Thermometer} iconColor="text-amber-400" label="Temp" value={`${day.temperatureC.toFixed(1)}°C`} />
        <Stat icon={Droplets} iconColor="text-cyan-400" label="ETo" value={`${day.eto.toFixed(1)}mm`} />
        <Stat icon={Sprout} iconColor="text-emerald-400" label="ETc" value={`${day.etc.toFixed(1)}mm`} />
        <Stat icon={CloudRain} iconColor="text-teal-400" label="Eff. rain" value={`${day.effectiveRain.toFixed(1)}mm`} />
        <Stat icon={Droplets} iconColor="text-amber-400" label="Deficit" value={`${day.deficit.toFixed(1)}mm`} />
        {day.irrigate && (
          <Stat icon={Droplets} iconColor="text-sky-400" label="Irrigate" value={`${day.irrigationMm.toFixed(0)}mm`} />
        )}
        {day.fertIrrigationMm > 0 && (
          <Stat icon={Droplets} iconColor="text-amber-400" label="Fert irrig." value={`${day.fertIrrigationMm.toFixed(0)}mm`} />
        )}
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  iconColor,
  label,
  value,
}: {
  icon: typeof CloudRain;
  iconColor: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon className={`size-3 ${iconColor}`} />
      <span className="text-white/50">{label}</span>
      <span className="font-mono text-white/85">{value}</span>
    </div>
  );
}

const deficitChartConfig = {
  deficit: {
    label: "Water deficit",
    color: "oklch(0.75 0.15 70)",
  },
  dmax: {
    label: "Irrigation threshold",
    color: "oklch(0.6 0.15 250)",
  },
} satisfies ChartConfig;

function getBarColor(day: DayPlan): string {
  if (day.fertStatus === "good") return "oklch(0.72 0.2 155)";
  if (day.fertStatus === "rejected") return "oklch(0.65 0.22 25)";
  if (day.irrigate) return "oklch(0.72 0.15 220)";
  return "oklch(0.78 0.18 85)";
}

function DeficitChart({ days, crop }: { days: DayPlan[]; crop: CropType }) {
  const chartData = useMemo(
    () =>
      days.map((d) => ({
        date: d.date,
        label: dateFormatter.format(new Date(d.date + "T12:00:00Z")),
        deficit: Math.round(d.deficit * 10) / 10,
        _fertStatus: d.fertStatus,
        _irrigate: d.irrigate,
      })),
    [days],
  );

  const dmax = CROP_DMAX[crop];

  return (
    <div className="rounded-lg border border-white/15 bg-white/8 p-3">
      <ChartContainer config={deficitChartConfig} className="h-[180px] w-full">
        <BarChart data={chartData} margin={{ left: 12, right: 12, top: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.18)" vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 11 }}
            minTickGap={24}
          />
          <YAxis
            dataKey="deficit"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 11 }}
            tickFormatter={(v) => `${v}mm`}
            domain={[0, "auto"]}
          />
          <ChartTooltip
            cursor={false}
            content={
              <ChartTooltipContent
                formatter={(value) => [`${value} mm`, "Deficit"]}
                labelFormatter={(_, payload) =>
                  payload?.[0]?.payload?.date
                    ? new Date(payload[0].payload.date + "T12:00:00Z").toLocaleDateString("en-GB", {
                        weekday: "long",
                        day: "numeric",
                        month: "short",
                        timeZone: "UTC",
                      })
                    : ""
                }
              />
            }
          />
          <ReferenceLine
            y={dmax}
            stroke="rgba(120,180,255,0.7)"
            strokeDasharray="4 4"
            strokeWidth={1.5}
          />
          <Bar dataKey="deficit" radius={[4, 4, 0, 0]} maxBarSize={32}>
            {chartData.map((entry, i) => {
              const day = days[i];
              return (
                <Cell
                  key={entry.date}
                  fill={day ? getBarColor(day) : "oklch(0.72 0.15 85)"}
                />
              );
            })}
          </Bar>
        </BarChart>
      </ChartContainer>
      <p className="mt-2 text-[10px] text-white/50">
        Dashed line: irrigation threshold ({dmax}mm). Bars show daily water deficit.
      </p>
    </div>
  );
}

function IrrigationSummary({ days }: { days: DayPlan[] }) {
  const irrigationDays = days.filter((d) => d.irrigate);
  if (irrigationDays.length === 0) return null;

  const totalMm = irrigationDays.reduce((s, d) => s + d.irrigationMm, 0);

  return (
    <div className="mt-4 rounded-lg border border-sky-400/25 bg-sky-500/15 p-3">
      <div className="flex items-center gap-2">
        <Droplets className="size-4 text-sky-400" />
        <span className="text-xs font-medium text-sky-200">
          {irrigationDays.length} irrigation event{irrigationDays.length > 1 ? "s" : ""} &middot; {totalMm.toFixed(0)}mm total
        </span>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {irrigationDays.map((d) => {
          const dt = new Date(d.date + "T12:00:00Z");
          return (
            <span
              key={d.date}
              className="rounded-full border border-sky-400/30 bg-sky-500/20 px-2 py-0.5 text-[10px] text-sky-200"
            >
              {dayFormatter.format(dt)} {dateFormatter.format(dt)} — {d.irrigationMm.toFixed(0)}mm
            </span>
          );
        })}
      </div>
    </div>
  );
}
