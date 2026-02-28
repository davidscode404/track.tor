"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import { CloudRain, Loader2, MapPin, RotateCcw, Sprout, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { WeatherPanel } from "./weather-summary";
import { RecommendationPanel } from "./fertilize-recommendation";
import type { FertilizeRecommendation } from "@/lib/fertilize";
import type { WeatherSummary } from "@/lib/types";

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

export function FertilizeWizard({ mapboxToken }: FertilizeWizardProps) {
  const [step, setStep] = useState(1);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [weather, setWeather] = useState<WeatherSummary | null>(null);
  const [recommendation, setRecommendation] =
    useState<FertilizeRecommendation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLocationSelect = useCallback(
    (newLat: number, newLng: number) => {
      setLat(newLat);
      setLng(newLng);
      setWeather(null);
      setRecommendation(null);
      setError(null);
      if (step !== 1) setStep(1);
    },
    [step],
  );

  const handleCheckWeather = useCallback(async () => {
    if (lat == null || lng == null) return;
    setLoading(true);
    setError(null);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const nextWeek = new Date(Date.now() + 7 * 86_400_000)
        .toISOString()
        .slice(0, 10);
      const res = await fetch(
        `/api/weather?lat=${lat}&lng=${lng}&from=${today}&to=${nextWeek}&daily=true`,
        { cache: "no-store" },
      );
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error?.message ?? "Weather fetch failed");
      setWeather(data.weather);
      setStep(2);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load weather");
    } finally {
      setLoading(false);
    }
  }, [lat, lng]);

  const handleGetRecommendation = useCallback(async () => {
    if (lat == null || lng == null) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/fertilize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat, lng }),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error?.message ?? "Recommendation failed");
      setRecommendation(data.recommendation);
      if (data.weather) setWeather(data.weather);
      setStep(3);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to get recommendation");
    } finally {
      setLoading(false);
    }
  }, [lat, lng]);

  const handleStartOver = useCallback(() => {
    setStep(1);
    setLat(null);
    setLng(null);
    setWeather(null);
    setRecommendation(null);
    setError(null);
  }, []);

  const handleDismissPanel = useCallback(() => {
    setStep(1);
  }, []);

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      <DynamicLocationPickerMap
        accessToken={mapboxToken}
        onLocationSelect={handleLocationSelect}
      />

      {step > 1 && (
        <div
          className="fixed inset-0 z-10 bg-black/25 transition-opacity duration-300"
          onClick={handleDismissPanel}
        />
      )}

      <div className="pointer-events-none fixed left-4 top-4 z-30">
        <div className="pointer-events-auto inline-flex items-center gap-2 rounded-lg bg-black/50 px-3 py-2 backdrop-blur-md">
          <Sprout className="size-4 text-emerald-400" />
          <span className="text-xs font-semibold tracking-[0.15em] text-white/90 uppercase">
            Fertilize
          </span>
        </div>
      </div>

      <div className="pointer-events-none fixed right-4 top-4 z-30 flex items-center gap-1.5">
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

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 flex justify-center p-4">
        {step === 1 && (
          <div className="pointer-events-auto animate-slide-up">
            {lat == null || lng == null ? (
              <div className="flex items-center gap-2 rounded-full bg-black/60 px-5 py-3 shadow-xl backdrop-blur-md">
                <MapPin className="size-4 text-emerald-400" />
                <span className="text-sm text-white/90">
                  Click anywhere on the map to select a location
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 rounded-2xl bg-black/60 px-5 py-4 shadow-xl backdrop-blur-md sm:flex-row">
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
                  className="gap-1.5 rounded-full bg-emerald-500 text-white hover:bg-emerald-400"
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
        )}
      </div>

      {step === 2 && weather && (
        <div className="fixed inset-x-0 bottom-0 z-20 animate-slide-up">
          <div className="mx-auto max-w-2xl">
            <div className="rounded-t-2xl border border-b-0 border-white/15 bg-black/70 shadow-2xl backdrop-blur-xl">
              <div className="flex items-center justify-between px-5 pt-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold tracking-widest text-white/50 uppercase">
                    Weather
                  </span>
                  <span className="text-xs text-white/30">
                    {lat?.toFixed(2)}°N, {lng?.toFixed(2)}°
                    {(lng ?? 0) >= 0 ? "E" : "W"}
                  </span>
                </div>
                <button
                  onClick={handleDismissPanel}
                  className="rounded-full p-1 text-white/40 transition-colors hover:bg-white/10 hover:text-white/80"
                >
                  <X className="size-4" />
                </button>
              </div>
              <WeatherPanel weather={weather} />
              <div className="flex items-center justify-between border-t border-white/10 px-5 py-4">
                <button
                  onClick={handleDismissPanel}
                  className="text-xs text-white/40 transition-colors hover:text-white/70"
                >
                  Back to map
                </button>
                <Button
                  size="sm"
                  onClick={handleGetRecommendation}
                  disabled={loading}
                  className="gap-1.5 rounded-full bg-emerald-500 text-white hover:bg-emerald-400"
                >
                  {loading ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Sprout className="size-3.5" />
                  )}
                  Get Recommendation
                </Button>
              </div>
              {error && (
                <p className="px-5 pb-3 text-xs text-red-400">{error}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {step === 3 && recommendation && (
        <div className="fixed inset-x-0 bottom-0 z-20 animate-slide-up">
          <div className="mx-auto max-w-2xl">
            <div className="rounded-t-2xl border border-b-0 border-white/15 bg-black/70 shadow-2xl backdrop-blur-xl">
              <div className="flex items-center justify-between px-5 pt-4">
                <span className="text-xs font-semibold tracking-widest text-white/50 uppercase">
                  Recommendation
                </span>
                <button
                  onClick={handleDismissPanel}
                  className="rounded-full p-1 text-white/40 transition-colors hover:bg-white/10 hover:text-white/80"
                >
                  <X className="size-4" />
                </button>
              </div>
              <RecommendationPanel
                recommendation={recommendation}
                weather={weather}
              />
              <div className="flex items-center justify-center border-t border-white/10 px-5 py-4">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleStartOver}
                  className="gap-1.5 rounded-full border-white/20 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white"
                >
                  <RotateCcw className="size-3.5" />
                  Start Over
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
