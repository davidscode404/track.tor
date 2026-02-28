"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";

import { UK_BOUNDING_BOX } from "@/lib/geo";

interface LocationPickerMapProps {
  accessToken: string;
  onLocationSelect: (lat: number, lng: number) => void;
}

export function LocationPickerMap({
  accessToken,
  onLocationSelect,
}: LocationPickerMapProps) {
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const onLocationSelectRef = useRef(onLocationSelect);
  onLocationSelectRef.current = onLocationSelect;

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

    map.on(
      "click",
      (e: mapboxgl.MapMouseEvent & { lngLat: mapboxgl.LngLat }) => {
        const { lng, lat } = e.lngLat;
        if (
          lat >= UK_BOUNDING_BOX.minLat &&
          lat <= UK_BOUNDING_BOX.maxLat &&
          lng >= UK_BOUNDING_BOX.minLng &&
          lng <= UK_BOUNDING_BOX.maxLng
        ) {
          if (!markerRef.current) {
            markerRef.current = new mapboxgl.Marker({ color: "#1f7a53" })
              .setLngLat([lng, lat])
              .addTo(map);
          } else {
            markerRef.current.setLngLat([lng, lat]);
          }
          onLocationSelectRef.current(lat, lng);
        }
      },
    );

    map.on("load", () => map.resize());

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [accessToken]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0"
      style={{ width: "100vw", height: "100vh" }}
    />
  );
}
