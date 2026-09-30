"use client";

import React, { useEffect, useState } from 'react';
import { Popup } from 'react-map-gl/maplibre';
import { useFleetStore } from '@/store/useFleetStore';
import { MapContainer } from '@/components/maps/MapContainer';
import { VehicleMarker } from '@/components/maps/VehicleMarker';
import { Button } from '@/components/ui/button';
import { Battery, Fuel, Power, Activity, Wifi, WifiOff } from 'lucide-react';
import Link from 'next/link';

export function FleetMap({ className }: { className?: string }) {
  const { vehicles, telemetry, selectedVehicleId, selectVehicle, initialize } = useFleetStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    initialize();
  }, [initialize]);

  if (!mounted) return null;

  const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);
  const selectedTelemetry = selectedVehicleId ? telemetry[selectedVehicleId] : null;
  const isOnline = selectedTelemetry?.connectionStatus === 'online';

  return (
    <MapContainer className={className}>
      {vehicles.map((vehicle) => {
        const vehicleTelemetry = telemetry[vehicle.id];
        if (!vehicleTelemetry) return null;
        return (
          <VehicleMarker
            key={vehicle.id}
            vehicle={vehicle}
            telemetry={vehicleTelemetry}
            isSelected={selectedVehicleId === vehicle.id}
            onClick={selectVehicle}
          />
        );
      })}

      {selectedVehicle && selectedTelemetry && (
        <Popup
          longitude={selectedTelemetry.location.longitude}
          latitude={selectedTelemetry.location.latitude}
          anchor="bottom"
          offset={22}
          onClose={() => selectVehicle(null)}
          closeOnClick={false}
          maxWidth="280px"
          // Remove maplibre default padding/bg so our custom div takes full control
          className="fleettrack-popup"
        >
          {/*
            MapLibre injects white bg + default font — we override with explicit
            inline styles so the popup looks correct in both light AND dark mode.
          */}
          <div style={{
            background: 'var(--card, #fff)',
            color: 'var(--card-foreground, #111)',
            borderRadius: '10px',
            padding: '14px',
            minWidth: '220px',
            border: '1px solid var(--border, #e2e8f0)',
            fontFamily: 'inherit',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
              <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--card-foreground, #111)' }}>
                {selectedVehicle.name}
              </span>
              <span style={{
                fontSize: '10px',
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: '999px',
                background: isOnline ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                color: isOnline ? '#16a34a' : '#dc2626',
              }}>
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>

            {/* Reg */}
            <div style={{ fontSize: '11px', color: 'var(--muted-foreground, #64748b)', marginBottom: '12px' }}>
              {selectedVehicle.registrationNumber}
            </div>

            {/* Stats grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                <Activity style={{ width: 14, height: 14, color: '#3b82f6' }} />
                <span style={{ color: 'var(--card-foreground, #111)', fontWeight: 600 }}>
                  {Math.round(selectedTelemetry.speed)} km/h
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                <Power style={{ width: 14, height: 14, color: selectedTelemetry.ignition ? '#22c55e' : '#94a3b8' }} />
                <span style={{ color: selectedTelemetry.ignition ? '#22c55e' : 'var(--muted-foreground, #64748b)', fontWeight: 600 }}>
                  {selectedTelemetry.ignition ? 'IGN ON' : 'IGN OFF'}
                </span>
              </div>
              {selectedTelemetry.fuel && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                  <Fuel style={{ width: 14, height: 14, color: '#3b82f6' }} />
                  <span style={{ color: 'var(--card-foreground, #111)', fontWeight: 600 }}>
                    {Math.round(selectedTelemetry.fuel.percentage)}%
                  </span>
                </div>
              )}
              {selectedTelemetry.batteryVoltage && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                  <Battery style={{ width: 14, height: 14, color: '#f59e0b' }} />
                  <span style={{ color: 'var(--card-foreground, #111)', fontWeight: 600 }}>
                    {selectedTelemetry.batteryVoltage.toFixed(1)}V
                  </span>
                </div>
              )}
            </div>

            {/* Updated time */}
            <div style={{ fontSize: '10px', color: 'var(--muted-foreground, #64748b)', marginBottom: '10px' }}>
              Updated: {new Date(selectedTelemetry.timestamp).toLocaleTimeString()}
            </div>

            {/* CTA */}
            <Link href={`/app/vehicles/${selectedVehicle.id}`} style={{ display: 'block' }}>
              <button style={{
                width: '100%',
                padding: '7px 0',
                background: 'var(--primary, #3b82f6)',
                color: 'var(--primary-foreground, #fff)',
                border: 'none',
                borderRadius: '7px',
                fontWeight: 600,
                fontSize: '12px',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}>
                View Vehicle →
              </button>
            </Link>
          </div>
        </Popup>
      )}
    </MapContainer>
  );
}
