import type {
  Feature,
  FeatureCollection,
  MultiPolygon,
  Polygon,
} from "geojson";

export type FarmGeometry = FeatureCollection<Polygon | MultiPolygon>;

export interface DailyWeather {
  date: string;
  rainMm: number;
  temperatureC: number;
  minTemperatureC: number;
  maxTemperatureC: number;
}

export type CropType = "lettuce" | "potato";

export type FertStatus = "good" | "rejected" | "irrigate-in" | "none";

export interface DayPlan {
  date: string;
  eto: number;
  etc: number;
  effectiveRain: number;
  deficit: number;
  irrigate: boolean;
  irrigationMm: number;
  fertStatus: FertStatus;
  fertReason: string;
  fertIrrigationMm: number;
  rainMm: number;
  temperatureC: number;
  maxTemperatureC: number;
}

export interface PlannerResult {
  crop: CropType;
  days: DayPlan[];
  bestFertDay: DayPlan | null;
  summary: string;
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
