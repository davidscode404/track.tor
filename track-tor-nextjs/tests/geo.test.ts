import { describe, expect, it } from "vitest";

import { assertFarmGeometry, computeBoundaryMetrics } from "../lib/geo";

describe("geo metrics", () => {
  it("computes area and centroid for a polygon", () => {
    const geometry = assertFarmGeometry({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {},
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [-120.1, 38.1],
                [-120.1, 38.09],
                [-120.09, 38.09],
                [-120.09, 38.1],
                [-120.1, 38.1],
              ],
            ],
          },
        },
      ],
    });

    const metrics = computeBoundaryMetrics(geometry);

    expect(metrics.areaHectares).toBeGreaterThan(0);
    expect(metrics.centroidLat).toBeGreaterThan(38.09);
    expect(metrics.centroidLng).toBeLessThan(-120.09);
  });

  it("rejects invalid geometry", () => {
    expect(() => assertFarmGeometry({ type: "FeatureCollection", features: [] })).toThrow();
  });
});
