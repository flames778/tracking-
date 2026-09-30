"use client";

import React, { useMemo } from 'react';
import Map, { NavigationControl, FullscreenControl, ViewState } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useTheme } from 'next-themes';

interface MapContainerProps {
  children?: React.ReactNode;
  initialViewState?: Partial<ViewState>;
  className?: string;
}

// Inline map styles using OpenStreetMap raster tiles — no CDN or API key required.
// Dark mode overlays a semi-transparent dark tint via a layer.
const LIGHT_STYLE = {
  version: 8 as const,
  sources: {
    osm: {
      type: "raster" as const,
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [
    {
      id: "osm-tiles",
      type: "raster" as const,
      source: "osm",
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

const DARK_STYLE = {
  version: 8 as const,
  sources: {
    osm: {
      type: "raster" as const,
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [
    {
      id: "osm-tiles",
      type: "raster" as const,
      source: "osm",
      minzoom: 0,
      maxzoom: 19,
      paint: {
        // Invert and desaturate for a dark map look without needing vector tiles
        "raster-saturation": -0.8,
        "raster-brightness-min": 0,
        "raster-brightness-max": 0.25,
        "raster-contrast": 0.2,
      },
    },
  ],
};

export function MapContainer({
  children,
  initialViewState = {
    longitude: 3.4,
    latitude: 6.5,
    zoom: 10,
  },
  className = "w-full h-full min-h-[400px]",
}: MapContainerProps) {
  const { resolvedTheme } = useTheme();

  const mapStyle = useMemo(
    () => (resolvedTheme === "dark" ? DARK_STYLE : LIGHT_STYLE),
    [resolvedTheme]
  );

  return (
    <div className={`relative rounded-md overflow-hidden ${className}`}>
      <Map
        initialViewState={initialViewState}
        mapStyle={mapStyle}
        attributionControl={false}
        reuseMaps
      >
        <NavigationControl position="bottom-right" />
        <FullscreenControl position="top-right" />
        {children}
      </Map>
    </div>
  );
}
