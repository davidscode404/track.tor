"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import MapboxDraw from "@mapbox/mapbox-gl-draw";

import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";

import {
  UK_BOUNDING_BOX,
  isBoundaryWithinUk,
  computeBoundaryMetrics,
} from "@/lib/geo";
import type { FarmGeometry } from "@/lib/types";

interface LocationPickerMapProps {
  accessToken: string;
  onLocationSelect: (lat: number, lng: number) => void;
  selection?: { lat: number; lng: number } | null;
}

export function LocationPickerMap({
  accessToken,
  onLocationSelect,
  selection = null,
}: LocationPickerMapProps) {
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const drawRef = useRef<MapboxDraw | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const onLocationSelectRef = useRef(onLocationSelect);

  useEffect(() => {
    onLocationSelectRef.current = onLocationSelect;
  }, [onLocationSelect]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !accessToken) return;

    mapboxgl.accessToken = accessToken;

    const map = new mapboxgl.Map({
      container,
      style: "mapbox://styles/mapbox/satellite-streets-v12",
      center: [-2.6, 54.5],
      zoom: 6,
      minZoom: 5,
      maxBounds: [
        [UK_BOUNDING_BOX.minLng, UK_BOUNDING_BOX.minLat],
        [UK_BOUNDING_BOX.maxLng, UK_BOUNDING_BOX.maxLat],
      ],
    });

    map.addControl(
      new mapboxgl.NavigationControl({ visualizePitch: true }),
      "top-right",
    );

    const draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: {
        polygon: true,
        trash: true,
      },
      defaultMode: "draw_polygon",
    });
    drawRef.current = draw;

    function updateFromDraw() {
      const data = draw.getAll();
      if (data.features.length === 0) return;

      const feature = data.features[0];
      if (feature.geometry.type !== "Polygon") return;

      const boundary: FarmGeometry = {
        type: "FeatureCollection",
        features: [feature as FarmGeometry["features"][0]],
      };

      if (!isBoundaryWithinUk(boundary)) {
        draw.deleteAll();
        return;
      }

      try {
        const { centroidLat, centroidLng } = computeBoundaryMetrics(boundary);
        onLocationSelectRef.current(centroidLat, centroidLng);
      } catch {
        draw.deleteAll();
      }
    }

    function onMapLoad() {
      map.addControl(draw as unknown as mapboxgl.IControl, "bottom-left");
      map.on("draw.create", updateFromDraw);
      map.on("draw.update", updateFromDraw);
      map.resize();
    }

    if (map.loaded()) {
      onMapLoad();
    } else {
      map.once("load", onMapLoad);
    }

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      drawRef.current = null;
    };
  }, [accessToken]);

  useEffect(() => {
    if (selection !== null) return;
    const draw = drawRef.current;
    const map = mapRef.current;
    if (!draw || !map) return;
    try {
      draw.deleteAll();
      (draw as MapboxDraw & { changeMode: (mode: string) => void }).changeMode("draw_polygon");
    } catch {
      // Draw may not be initialized yet (map not loaded) or already torn down
    }
  }, [selection]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-0"
      style={{ width: "100vw", height: "100vh" }}
    />
  );
}
