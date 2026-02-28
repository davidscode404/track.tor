import type { Feature, FeatureCollection, MultiPolygon, Polygon } from "geojson";
import { area as turfArea, centroid as turfCentroid } from "@turf/turf";

import type { BoundaryMetrics, FarmGeometry } from "@/lib/types";

export const UK_BOUNDING_BOX = {
  minLng: -10.9,
  minLat: 49.7,
  maxLng: 2.2,
  maxLat: 61.0,
};

function isFeatureCollection(value: unknown): value is FeatureCollection {
  return typeof value === "object" && value !== null && (value as { type?: string }).type === "FeatureCollection";
}

function coordinatesWithinUk(bounds: number[]): boolean {
  const [lng, lat] = bounds;
  return (
    lng >= UK_BOUNDING_BOX.minLng &&
    lng <= UK_BOUNDING_BOX.maxLng &&
    lat >= UK_BOUNDING_BOX.minLat &&
    lat <= UK_BOUNDING_BOX.maxLat
  );
}

export function getBoundaryVertexCount(boundary: FarmGeometry): number {
  const feature = boundary.features[0];
  if (feature.geometry.type === "Polygon") {
    const ring = feature.geometry.coordinates[0] ?? [];
    return Math.max(0, ring.length - 1);
  }

  const counts = feature.geometry.coordinates.map((polygon) => {
    const outerRing = polygon[0] ?? [];
    return Math.max(0, outerRing.length - 1);
  });

  return Math.max(0, ...counts);
}

export function isBoundaryWithinUk(boundary: FarmGeometry): boolean {
  const feature = boundary.features[0];

  if (feature.geometry.type === "Polygon") {
    return feature.geometry.coordinates[0].every((coordinate) => coordinatesWithinUk(coordinate));
  }

  return feature.geometry.coordinates.every((polygon) =>
    polygon.every((ring) => ring.every((coordinate) => coordinatesWithinUk(coordinate))),
  );
}

export function validateUkBoundaryRules(boundary: FarmGeometry): void {
  const vertices = getBoundaryVertexCount(boundary);

  if (vertices > 5) {
    throw new Error("Farm boundary supports a maximum of 5 points.");
  }

  if (!isBoundaryWithinUk(boundary)) {
    throw new Error("Farm boundary must be within the United Kingdom.");
  }
}

export function assertFarmGeometry(value: unknown): FarmGeometry {
  if (!isFeatureCollection(value)) {
    throw new Error("boundaryGeoJson must be a FeatureCollection");
  }

  const features = (value.features ?? []) as Feature[];
  const polygonFeatures = features.filter((feature) => {
    return feature?.geometry?.type === "Polygon" || feature?.geometry?.type === "MultiPolygon";
  }) as Feature<Polygon | MultiPolygon>[];

  if (polygonFeatures.length === 0) {
    throw new Error("boundaryGeoJson must include at least one Polygon or MultiPolygon");
  }

  return {
    type: "FeatureCollection",
    features: [polygonFeatures[0]],
  };
}

export function computeBoundaryMetrics(boundary: FarmGeometry): BoundaryMetrics {
  const polygonFeature = boundary.features[0];
  const areaSquareMeters = turfArea(polygonFeature);

  if (!Number.isFinite(areaSquareMeters) || areaSquareMeters <= 0) {
    throw new Error("Polygon area must be greater than zero");
  }

  const center = turfCentroid(polygonFeature);
  const [centroidLng, centroidLat] = center.geometry.coordinates;

  return {
    areaHectares: areaSquareMeters / 10_000,
    centroidLat,
    centroidLng,
  };
}
