"use client";

import Image from "next/image";
import { useCallback, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";

type Severity = "healthy" | "deficiency" | "disease";

interface ClassMeta {
  label: string;
  description?: string;
  severity: Severity;
}

const CLASS_INFO: Record<string, Record<string, ClassMeta>> = {
  lettuce: {
    FN: { label: "Fully Nutritional", severity: "healthy" },
    N: { label: "Nitrogen Deficient", severity: "deficiency" },
    P: { label: "Phosphorus Deficient", severity: "deficiency" },
    K: { label: "Potassium Deficient", severity: "deficiency" },
  },
  potato: {
    Healthy: { label: "Healthy", severity: "healthy" },
    "Early blight": {
      label: "Early Blight",
      description: "Fungal disease caused by Alternaria solani",
      severity: "disease",
    },
    "Late blight": {
      label: "Late Blight",
      description: "Disease caused by Phytophthora infestans",
      severity: "disease",
    },
  },
};

const SEVERITY_STYLES: Record<
  Severity,
  { border: string; bg: string; text: string; iconBg: string }
> = {
  healthy: {
    border: "border-emerald-500/30",
    bg: "bg-emerald-500/10",
    text: "text-emerald-300",
    iconBg: "bg-emerald-500/30",
  },
  deficiency: {
    border: "border-amber-500/30",
    bg: "bg-amber-500/10",
    text: "text-amber-300",
    iconBg: "bg-amber-500/30",
  },
  disease: {
    border: "border-red-500/30",
    bg: "bg-red-500/10",
    text: "text-red-300",
    iconBg: "bg-red-500/30",
  },
};

function normalizePrediction(crop: string, prediction: string): string {
  const t = prediction.trim();
  if (crop === "potato" && t.includes("___")) {
    const part = (t.split("___").pop() ?? t).replace(/_/g, " ");
    return part;
  }
  if (t.startsWith("-") && t.length > 1) {
    return t.slice(1);
  }
  return t;
}

function getClassMeta(crop: string, prediction: string): ClassMeta {
  const key = normalizePrediction(crop, prediction);
  const cropMap = CLASS_INFO[crop];
  if (!cropMap) {
    return { label: prediction, severity: "deficiency" as Severity };
  }
  return (
    cropMap[prediction] ??
    cropMap[key] ?? {
      label: prediction,
      severity: "deficiency" as Severity,
    }
  );
}

interface PredictResponse {
  crop: string;
  prediction: string;
  confidence: number;
  classes: string[];
}

export interface CropHealthCheckProps {
  crop: "lettuce" | "potato";
  compact?: boolean;
}

export function CropHealthCheck({
  crop,
  compact = false,
}: CropHealthCheckProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PredictResponse | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<string | null>(null);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      setFile(f ?? null);
      setResult(null);
      setError(null);
      if (previewRef.current) {
        URL.revokeObjectURL(previewRef.current);
        previewRef.current = null;
      }
      if (f) {
        const url = URL.createObjectURL(f);
        previewRef.current = url;
        setPreview(url);
      } else {
        setPreview(null);
      }
    },
    [],
  );

  const handleSubmit = useCallback(async () => {
    if (!file) {
      setError("Please select an image");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const formData = new FormData();
      formData.set("crop", crop);
      formData.set("file", file);

      const res = await fetch("/api/predict", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Prediction failed");
      }

      setResult(data as PredictResponse);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Prediction failed");
    } finally {
      setLoading(false);
    }
  }, [crop, file]);

  const handleReset = useCallback(() => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
    if (previewRef.current) {
      URL.revokeObjectURL(previewRef.current);
      previewRef.current = null;
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const meta = result ? getClassMeta(result.crop, result.prediction) : null;
  const styles = meta ? SEVERITY_STYLES[meta.severity] : null;
  const SeverityIcon =
    meta?.severity === "healthy" ? CheckCircle2 : AlertTriangle;

  return (
    <div className="flex flex-col gap-3">
      <span className="text-[10px] font-medium uppercase tracking-wider text-white/40">
        Crop health check (optional)
      </span>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className="block w-full text-sm text-white/80 file:mr-2 file:rounded-full file:border-0 file:bg-emerald-500 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-black file:hover:bg-emerald-400"
      />
      {preview && (
        <div
          className={`relative overflow-hidden rounded-lg border border-white/10 h-48 w-full`}
        >
          <Image
            src={preview}
            alt="Preview"
            fill
            className="object-cover "
            unoptimized
          />
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={handleSubmit}
          disabled={loading || !file}
          size={compact ? "sm" : "default"}
          className="gap-1.5 rounded-full bg-emerald-500 text-black hover:bg-emerald-400"
        >
          {loading ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Upload className="size-3.5" />
          )}
          {loading ? "Analyzing…" : "Analyze"}
        </Button>
        {file && (
          <Button
            variant="outline"
            size={compact ? "sm" : "default"}
            onClick={handleReset}
            disabled={loading}
            className="rounded-full border-white/20 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white"
          >
            Clear
          </Button>
        )}
      </div>
      {error && (
        <p
          className={compact ? "text-xs text-red-400" : "text-sm text-red-400"}
        >
          {error}
        </p>
      )}
      {result && meta && styles && (
        <div className={`rounded-xl border p-3 ${styles.border} ${styles.bg}`}>
          <div className="flex items-start gap-2.5">
            <div
              className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full ${styles.iconBg}`}
            >
              <SeverityIcon className={`size-4 ${styles.text}`} />
            </div>
            <div className="min-w-0">
              <p
                className={`text-sm font-semibold leading-snug ${styles.text}`}
              >
                {meta.label}
              </p>
              {!compact && meta.description && (
                <p className="mt-0.5 text-xs text-white/55">
                  {meta.description}
                </p>
              )}
              <p className="mt-0.5 text-xs text-white/70">
                {(result.confidence * 100).toFixed(1)}% confidence
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
