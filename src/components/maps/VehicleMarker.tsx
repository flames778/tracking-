"use client";

import React from 'react';
import { Marker } from 'react-map-gl/maplibre';
import { Navigation2 } from 'lucide-react';
import { Vehicle, VehicleTelemetry } from '@/types';

interface VehicleMarkerProps {
  vehicle: Vehicle;
  telemetry: VehicleTelemetry;
  isSelected: boolean;
  onClick: (vehicleId: string) => void;
}

export function VehicleMarker({ vehicle, telemetry, isSelected, onClick }: VehicleMarkerProps) {
  const isOnline = telemetry.connectionStatus === 'online';
  
  // Choose color based on status
  let markerColor = "bg-primary";
  if (!isOnline) {
    markerColor = "bg-destructive";
  } else if (!telemetry.ignition) {
    markerColor = "bg-muted-foreground";
  } else if (telemetry.speed > 80) {
    markerColor = "bg-amber-500";
  }

  return (
    <Marker
      longitude={telemetry.location.longitude}
      latitude={telemetry.location.latitude}
      anchor="center"
      onClick={(e) => {
        e.originalEvent.stopPropagation();
        onClick(vehicle.id);
      }}
      style={{ zIndex: isSelected ? 10 : 1 }}
    >
      <div className="relative group cursor-pointer">
        <div 
          className={`w-8 h-8 rounded-full flex items-center justify-center shadow-lg border-2 ${isSelected ? 'border-primary shadow-primary/50' : 'border-background'} ${markerColor} transition-all duration-300 transform ${isSelected ? 'scale-125' : 'hover:scale-110'}`}
          style={{ transform: `rotate(${telemetry.heading}deg) ${isSelected ? 'scale(1.25)' : ''}` }}
        >
          <Navigation2 className="h-4 w-4 text-white fill-white" />
        </div>
        
        {/* Simple tooltip on hover for desktop if not selected */}
        {!isSelected && (
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-2 py-1 bg-card border border-border rounded text-[10px] font-bold opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity">
            {vehicle.name}
          </div>
        )}
      </div>
    </Marker>
  );
}
