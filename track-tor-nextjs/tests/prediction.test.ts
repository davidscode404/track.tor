import { describe, expect, it } from "vitest";

import { buildPrediction } from "../lib/prediction";
import type { Farm, MonthlyRecord, WeatherSummary } from "../lib/types";

const farm: Farm = {
  id: "11111111-1111-1111-1111-111111111111",
  name: "Test Farm",
  boundaryGeoJson: {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [0, 0],
              [0, 1],
              [1, 1],
              [1, 0],
              [0, 0],
            ],
          ],
        },
      },
    ],
  },
  areaHectares: 100,
  centroidLat: 0.5,
  centroidLng: 0.5,
  createdAt: "2026-01-01T00:00:00.000Z",
};

const records: MonthlyRecord[] = [
  {
    id: "a",
    farmId: farm.id,
    month: "2025-11-01",
    fertilizerKg: 300,
    fertilizerCostUsd: 450,
    expectedYieldTons: 12,
    actualTotalCostUsd: 2400,
    notes: null,
  },
  {
    id: "b",
    farmId: farm.id,
    month: "2025-12-01",
    fertilizerKg: 320,
    fertilizerCostUsd: 470,
    expectedYieldTons: 11.5,
    actualTotalCostUsd: 2520,
    notes: null,
  },
  {
    id: "c",
    farmId: farm.id,
    month: "2026-01-01",
    fertilizerKg: 355,
    fertilizerCostUsd: 510,
    expectedYieldTons: 10.8,
    actualTotalCostUsd: 2660,
    notes: null,
  },
];

describe("prediction engine", () => {
  it("returns bounded range and budget periods", () => {
    const weather: WeatherSummary = {
      source: "open-meteo",
      periodStart: "2026-01-01",
      periodEnd: "2026-01-31",
      rainMm: 21,
      avgTemperatureC: 12,
      avgWindMps: 8,
      dryIndex: 0.62,
      drySeason: true,
      rainAnomaly: 0.72,
      windStress: 0.66,
      rawPayload: {},
    };

    const prediction = buildPrediction({
      farm,
      records,
      weather,
      targetMonth: "2026-02-01",
    });

    expect(prediction.optimisticCostUsd).toBeLessThan(prediction.baseCostUsd);
    expect(prediction.pessimisticCostUsd).toBeGreaterThan(prediction.baseCostUsd);
    expect(prediction.budgetByPeriod.days60).toBeGreaterThan(prediction.budgetByPeriod.days30);
    expect(prediction.budgetByPeriod.days90).toBeGreaterThan(prediction.budgetByPeriod.days60);
    expect(prediction.drivers.length).toBeGreaterThan(0);
  });

  it("requires at least two records", () => {
    expect(() =>
      buildPrediction({
        farm,
        records: [records[0]],
        weather: {
          source: "open-meteo",
          periodStart: "2026-01-01",
          periodEnd: "2026-01-31",
          rainMm: 50,
          avgTemperatureC: 16,
          avgWindMps: 4,
          dryIndex: 0.2,
          drySeason: false,
          rainAnomaly: 0.3,
          windStress: 0.2,
          rawPayload: {},
        },
        targetMonth: "2026-02-01",
      }),
    ).toThrow("At least 2 monthly records");
  });
});
