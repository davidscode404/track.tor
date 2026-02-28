import type { Feature, FeatureCollection, MultiPolygon, Polygon } from "geojson";

export type FarmGeometry = FeatureCollection<Polygon | MultiPolygon>;

export interface Farm {
  id: string;
  name: string;
  boundaryGeoJson: FarmGeometry;
  areaHectares: number;
  centroidLat: number;
  centroidLng: number;
  createdAt: string;
}

export interface MonthlyRecord {
  id: string;
  farmId: string;
  month: string;
  fertilizerKg: number;
  fertilizerCostUsd: number;
  expectedYieldTons: number;
  actualTotalCostUsd: number;
  notes: string | null;
}

export interface DailyWeather {
  date: string;
  rainMm: number;
  temperatureC: number;
}

export interface WeatherSummary {
  source: "open-meteo";
  periodStart: string;
  periodEnd: string;
  rainMm: number;
  avgTemperatureC: number;
  avgWindMps: number;
  dryIndex: number;
  drySeason: boolean;
  rainAnomaly: number;
  windStress: number;
  rawPayload: unknown;
  note?: string;
  daily?: DailyWeather[];
}

export interface PredictionDriver {
  key: string;
  label: string;
  contribution: number;
}

export interface PredictionResult {
  targetMonth: string;
  baseCostUsd: number;
  optimisticCostUsd: number;
  pessimisticCostUsd: number;
  deltaVsLastMonthPct: number;
  drySeason: boolean;
  drivers: PredictionDriver[];
  budgetByPeriod: {
    days30: number;
    days60: number;
    days90: number;
  };
  uncertainty: number;
}

export interface PredictionInputFeatures {
  avgCost3m: number;
  fertIntensity: number;
  yieldTrend: number;
  rainAnomaly: number;
  windStress: number;
  dryIndex: number;
  recentCostTrend: number;
}

export interface BoundaryMetrics {
  areaHectares: number;
  centroidLat: number;
  centroidLng: number;
}

export interface WeatherProvider {
  getSummary(input: {
    lat: number;
    lng: number;
    from: string;
    to: string;
    daily?: boolean;
  }): Promise<WeatherSummary>;
}

export type PolygonFeature = Feature<Polygon | MultiPolygon>;
