"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import { BotMessageSquare, CloudRain, Loader2, MapPin, RotateCcw, Sprout, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { CropHealthCheck } from "@/components/identify/crop-health-check";
import { PlannerPanel } from "./planner-results";
import { WeatherPanel } from "./weather-summary";
import type { CropType, PlannerResult, WeatherSummary } from "@/lib/types";

const DynamicLocationPickerMap = dynamic(
  () => import("./location-picker-map").then((mod) => mod.LocationPickerMap),
  {
    ssr: false,
    loading: () => (
      <div className="fixed inset-0 flex items-center justify-center bg-emerald-950">
        <Loader2 className="size-8 animate-spin text-white/60" />
      </div>
    ),
  },
);

interface FertilizeWizardProps {
  mapboxToken: string;
}

type ApiErrorPayload = {
  error?: { message?: string } | string;
};

type WeatherApiResponse = ApiErrorPayload & {
  weather?: WeatherSummary;
};

type FertilizeApiResponse = ApiErrorPayload & {
  weather?: WeatherSummary;
  plan?: PlannerResult;
};

function getApiErrorMessage(
  payload: ApiErrorPayload,
  fallback: string,
): string {
  if (typeof payload.error === "string" && payload.error.trim().length > 0) {
    return payload.error;
  }
  if (typeof payload.error === "object" && payload.error?.message) {
    return payload.error.message;
  }
  return fallback;
}

async function parseResponseJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) return {} as T;

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(
      `Server returned invalid JSON (status ${response.status}). Check API logs.`,
    );
  }
}

type PeriodDays = 7 | 14;

const CROP_OPTIONS: { value: CropType; label: string; emoji: string }[] = [
  { value: "lettuce", label: "Lettuce", emoji: "🥬" },
  { value: "potato", label: "Potato", emoji: "🥔" },
];

export function FertilizeWizard({ mapboxToken }: FertilizeWizardProps) {
  const [step, setStep] = useState(1);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [periodDays, setPeriodDays] = useState<PeriodDays>(14);
  const [crop, setCrop] = useState<CropType>("lettuce");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [weather, setWeather] = useState<WeatherSummary | null>(null);
  const [plan, setPlan] = useState<PlannerResult | null>(null);
  const [llmRecommendation, setLlmRecommendation] = useState<string | null>(null);
  const [recommendLoading, setRecommendLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLocationSelect = useCallback(
    (newLat: number, newLng: number) => {
      setLat(newLat);
      setLng(newLng);
      setWeather(null);
      setPlan(null);
      setLlmRecommendation(null);
      setError(null);
      if (step !== 1) setStep(1);
    },
    [step],
  );

  const fetchWeather = useCallback(
    async (days: PeriodDays) => {
      if (lat == null || lng == null) return;
      setLoading(true);
      setError(null);
      try {
        const today = new Date().toISOString().slice(0, 10);
        const endDate = new Date(Date.now() + days * 86_400_000)
          .toISOString()
          .slice(0, 10);
        const res = await fetch(
          `/api/weather?lat=${lat}&lng=${lng}&from=${today}&to=${endDate}&daily=true`,
          { cache: "no-store" },
        );
        const data = await parseResponseJson<WeatherApiResponse>(res);
        if (!res.ok) {
          throw new Error(getApiErrorMessage(data, "Weather fetch failed"));
        }
        if (!data.weather) {
          throw new Error("Weather response is missing weather data.");
        }
        setWeather(data.weather);
        setPeriodDays(days);
        setStep(2);
        setDrawerOpen(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load weather");
      } finally {
        setLoading(false);
      }
    },
    [lat, lng],
  );

  const handleCheckWeather = useCallback(() => {
    fetchWeather(periodDays);
  }, [fetchWeather, periodDays]);

  const handleGetPlan = useCallback(async () => {
    if (lat == null || lng == null) return;
    setLoading(true);
    setError(null);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const endDate = new Date(Date.now() + periodDays * 86_400_000)
        .toISOString()
        .slice(0, 10);
      const res = await fetch("/api/fertilize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat,
          lng,
          crop,
          periodStart: today,
          periodEnd: endDate,
        }),
      });
      const data = await parseResponseJson<FertilizeApiResponse>(res);
      if (!res.ok) {
        throw new Error(getApiErrorMessage(data, "Plan generation failed"));
      }
      if (!data.plan) {
        throw new Error("Response is missing plan data.");
      }
      setPlan(data.plan);
      setLlmRecommendation(null);
      if (data.weather) setWeather(data.weather);
      setStep(3);
      setDrawerOpen(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate plan");
    } finally {
      setLoading(false);
    }
  }, [lat, lng, periodDays, crop]);

  const handleGetRecommendation = useCallback(async () => {
    if (!weather) return;
    setRecommendLoading(true);
    try {
      const payload = weather.rawPayload as {
        rainfallEntries?: { time: string; precipitation_mm: number; rain_mm: number; snowfall_cm: number }[];
        temperatureEntries?: { time: string; temperature_c: number; feels_like_c: number }[];
      } | undefined;

      if (!payload?.rainfallEntries || !payload?.temperatureEntries) {
        throw new Error("Weather data not available for recommendation.");
      }

      const temperatureData = payload.temperatureEntries
        .map((e) => JSON.stringify(e))
        .join("\n");
      const rainfallData = payload.rainfallEntries
        .map((e) => JSON.stringify(e))
        .join("\n");

      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          temperature_data: temperatureData,
          rainfall_data: rainfallData,
          crop,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Recommendation failed",
        );
      }
      setLlmRecommendation(data.recommendation ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to get recommendation");
    } finally {
      setRecommendLoading(false);
    }
  }, [weather, crop]);

  const handleStartOver = useCallback(() => {
    setStep(1);
    setLat(null);
    setLng(null);
    setWeather(null);
    setPlan(null);
    setLlmRecommendation(null);
    setError(null);
  }, []);

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      <DynamicLocationPickerMap
        accessToken={mapboxToken}
        onLocationSelect={handleLocationSelect}
        selection={lat != null && lng != null ? { lat, lng } : null}
      />

      <div className="pointer-events-none fixed left-4 top-4 z-30">
        <div className="pointer-events-auto inline-flex items-center gap-2 rounded-lg bg-black/90 border border-white/10 px-3 py-2 backdrop-blur-md">
          <Sprout className="size-4 text-emerald-400" />
          <span className="text-xs font-semibold tracking-[0.15em] text-white/90 uppercase">
            Track-Tor
          </span>
        </div>
      </div>

      <div className="pointer-events-none fixed right-4 top-4 z-30 flex items-center gap-2">
        <div className="pointer-events-auto flex items-center gap-1.5">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`size-2 rounded-full transition-all duration-300 ${
                s === step
                  ? "scale-125 bg-white shadow-[0_0_6px_rgba(255,255,255,0.6)]"
                  : s < step
                    ? "bg-white/60"
                    : "bg-white/25"
              }`}
            />
          ))}
        </div>
        <Drawer
          direction="right"
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
        >
          <DrawerContent className="border-white/15 bg-zinc-900 text-white">
            <DrawerHeader className="flex flex-row items-center justify-between border-b border-white/10 px-5 py-4">
              <DrawerTitle className="font-sans text-base font-semibold uppercase tracking-widest text-white">
                {step === 1 ? "Panel" : step === 2 ? "Weather" : "Plan"}
              </DrawerTitle>
              <DrawerClose asChild>
                <button
                  type="button"
                  className="rounded-full p-1 text-white/40 transition-colors hover:bg-white/10 hover:text-white/80"
                  aria-label="Close panel"
                >
                  <X className="size-4" />
                </button>
              </DrawerClose>
            </DrawerHeader>
            <div className="flex flex-1 flex-col overflow-y-auto">
              {step === 1 && (
                <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
                  <MapPin className="size-10 text-white/30" />
                  <p className="text-sm text-white/55">
                    Draw a polygon on the map to select an area, then click
                    Check Weather to view forecast and plan.
                  </p>
                </div>
              )}
              {step === 2 && weather && (
                <div className="flex flex-col">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-3">
                    <span className="text-xs text-white/50">
                      {lat?.toFixed(2)}°N, {lng?.toFixed(2)}°
                      {(lng ?? 0) >= 0 ? "E" : "W"}
                    </span>
                    <div className="flex rounded-full border border-white/20 bg-white/5">
                      <button
                        type="button"
                        onClick={() => fetchWeather(7)}
                        disabled={loading}
                        className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                          periodDays === 7
                            ? "bg-emerald-500/30 text-emerald-300"
                            : "text-white/60 hover:text-white/80 disabled:opacity-50"
                        }`}
                      >
                        1 week
                      </button>
                      <button
                        type="button"
                        onClick={() => fetchWeather(14)}
                        disabled={loading}
                        className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                          periodDays === 14
                            ? "bg-emerald-500/30 text-emerald-300"
                            : "text-white/60 hover:text-white/80 disabled:opacity-50"
                        }`}
                      >
                        2 weeks
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-5 py-3">
                    <span className="text-[10px] font-medium uppercase tracking-wider text-white/40">
                      Crop
                    </span>
                    <ButtonGroup
                      aria-label="Select crop type"
                      className="[--radius:9999rem] rounded-full border border-white/20 bg-white/5"
                    >
                      {CROP_OPTIONS.map((opt) => (
                        <Button
                          key={opt.value}
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setCrop(opt.value)}
                          className={`h-auto px-3 py-1.5 text-xs font-medium transition-colors ${
                            crop === opt.value
                              ? "bg-emerald-500/30 text-emerald-300 hover:bg-emerald-500/40 hover:text-emerald-300"
                              : "text-white/60 hover:bg-white/5 hover:text-white/80"
                          }`}
                        >
                          <span className="mr-1">{opt.emoji}</span>
                          {opt.label}
                        </Button>
                      ))}
                    </ButtonGroup>
                  </div>
                  <div className="border-t border-white/10 px-5 py-3">
                    <CropHealthCheck crop={crop} compact />
                  </div>
                  <WeatherPanel weather={weather} periodDays={periodDays} />
                  <div className="flex flex-col gap-3 border-t border-white/10 p-5">
                    <Button
                      size="sm"
                      onClick={handleGetPlan}
                      disabled={loading}
                      className="w-full gap-1.5 rounded-full bg-emerald-500 text-black hover:bg-emerald-400"
                    >
                      {loading ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Sprout className="size-3.5" />
                      )}
                      Get Plan
                    </Button>
                    {error && <p className="text-xs text-red-400">{error}</p>}
                  </div>
                </div>
              )}

              {step === 3 && plan && (
                <div className="flex flex-col">
                  <PlannerPanel plan={plan} llmRecommendation={llmRecommendation} />
                  <div className="mt-auto flex flex-col gap-2 border-t border-white/10 p-5">
                    {!llmRecommendation && (
                      <Button
                        size="sm"
                        onClick={handleGetRecommendation}
                        disabled={recommendLoading}
                        className="w-full gap-1.5 rounded-full bg-violet-600 text-white hover:bg-violet-500"
                      >
                        {recommendLoading ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <BotMessageSquare className="size-3.5" />
                        )}
                        {recommendLoading ? "Generating…" : "Get AI Recommendation"}
                      </Button>
                    )}
                    {error && step === 3 && (
                      <p className="text-xs text-red-400">{error}</p>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleStartOver}
                      className="w-full gap-1.5 rounded-full border-white/20 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white"
                    >
                      <RotateCcw className="size-3.5" />
                      Start Over
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </DrawerContent>
        </Drawer>
      </div>

      {step === 1 && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 flex justify-center p-4">
          <div className="pointer-events-auto animate-slide-up">
            {lat == null || lng == null ? (
              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-zinc-900 px-5 py-3 shadow-xl backdrop-blur-md">
                <MapPin className="size-4 text-emerald-400" />
                <span className="text-sm text-white/90">
                  Draw a polygon on the map to select an area
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-zinc-900 px-5 py-4 shadow-xl backdrop-blur-md sm:flex-row">
                <div className="flex items-center gap-2">
                  <MapPin className="size-4 text-emerald-400" />
                  <span className="text-sm font-medium text-white">
                    {lat.toFixed(4)}°N, {lng.toFixed(4)}°{lng >= 0 ? "E" : "W"}
                  </span>
                </div>
                <Button
                  size="sm"
                  onClick={handleCheckWeather}
                  disabled={loading}
                  className="gap-1.5 rounded-full bg-emerald-500 text-black hover:bg-emerald-400"
                >
                  {loading ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <CloudRain className="size-3.5" />
                  )}
                  Check Weather
                </Button>
              </div>
            )}
            {error && step === 1 && (
              <p className="mt-2 text-center text-xs text-red-400">{error}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
