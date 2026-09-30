"use client";

import { useEffect, useState } from "react";
import { FleetMap } from "@/components/dashboard/FleetMap";
import { useFleetStore } from "@/store/useFleetStore";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Navigation2, Maximize } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function LiveMapPage() {
  const { vehicles, telemetry, selectedVehicleId, selectVehicle, initialize } = useFleetStore();
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setMounted(true);
    initialize();
  }, [initialize]);

  if (!mounted) return null;

  const filteredVehicles = vehicles.filter(v => 
    v.name.toLowerCase().includes(search.toLowerCase()) || 
    v.registrationNumber.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-8rem)] md:h-[calc(100vh-6rem)] -m-4 md:-m-6 lg:-m-8">
      {/* Left Panel */}
      <div className="w-80 border-r border-border bg-card flex flex-col hidden md:flex">
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold mb-4">Vehicle Status</h2>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search vehicles..." 
              className="pl-9 bg-muted/50" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {filteredVehicles.map(vehicle => {
              const data = telemetry[vehicle.id];
              const isSelected = selectedVehicleId === vehicle.id;
              
              if (!data) return null;
              
              return (
                <div 
                  key={vehicle.id}
                  onClick={() => selectVehicle(vehicle.id)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${isSelected ? 'bg-primary/10 border border-primary/30' : 'hover:bg-muted border border-transparent'}`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-semibold text-sm">{vehicle.name}</span>
                    <Badge variant={data.connectionStatus === 'online' ? 'default' : 'secondary'} className="text-[10px] h-4 px-1.5">
                      {Math.round(data.speed)} km/h
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mb-2">
                    {vehicle.registrationNumber}
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="flex items-center gap-1">
                      <div className={`w-2 h-2 rounded-full ${data.ignition ? 'bg-green-500' : 'bg-muted-foreground'}`}></div>
                      {data.ignition ? 'Ignition ON' : 'Ignition OFF'}
                    </span>
                    <span className="text-muted-foreground">
                      {new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>
      
      {/* Map Area */}
      <div className="flex-1 relative">
        <FleetMap className="w-full h-full rounded-none" />
        
        {/* Floating Action Button for mobile list toggle could go here */}
        <div className="absolute top-4 left-4 z-10 md:hidden">
          <div className="bg-card shadow-lg rounded-lg border border-border px-4 py-2 text-sm font-semibold">
            {vehicles.length} Vehicles Tracking
          </div>
        </div>
      </div>
    </div>
  );
}
