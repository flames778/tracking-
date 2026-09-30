"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Car, Wifi, WifiOff, AlertTriangle, Shield, Activity, Route, Fuel } from "lucide-react";
import { FleetMap } from "@/components/dashboard/FleetMap";
import { useFleetStore } from "@/store/useFleetStore";

export default function DashboardPage() {
  const { vehicles, telemetry, alerts, initialize, isSimulating } = useFleetStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    initialize();
  }, [initialize]);

  if (!mounted) return null;

  // Calculate stats
  const totalVehicles = vehicles.length;
  const onlineCount = Object.values(telemetry).filter(t => t.connectionStatus === 'online').length;
  const offlineCount = totalVehicles - onlineCount;
  const activeAlerts = alerts.filter(a => !a.isRead).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4 items-center">
        <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
        {isSimulating && (
          <div className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            DEMO MODE: Simulated Telemetry
          </div>
        )}
      </div>
      
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Vehicles</CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalVehicles}</div>
            <p className="text-xs text-muted-foreground">Active in your fleet</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Online</CardTitle>
            <Wifi className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{onlineCount}</div>
            <p className="text-xs text-muted-foreground">Currently transmitting data</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Offline</CardTitle>
            <WifiOff className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{offlineCount}</div>
            <p className="text-xs text-muted-foreground">Lost connection</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-500">{activeAlerts}</div>
            <p className="text-xs text-muted-foreground">Require attention</p>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4 min-h-[400px] flex flex-col p-0 overflow-hidden border-border/50">
          <FleetMap className="w-full h-full min-h-[400px]" />
        </Card>
        
        {/* Activity Feed */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Recent Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {alerts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Shield className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>No recent activity or alerts.</p>
                </div>
              ) : (
                alerts.slice(0, 6).map((alert) => {
                  const vehicle = vehicles.find(v => v.id === alert.vehicleId);
                  
                  return (
                    <div key={alert.id} className="flex items-start gap-4">
                      <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center bg-destructive/10`}>
                        <AlertTriangle className={`h-4 w-4 text-destructive`} />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium leading-none">
                          <span className="font-bold">{vehicle?.name || 'Unknown'}:</span> {alert.message}
                        </p>
                        <p className="text-xs text-muted-foreground">{new Date(alert.timestamp).toLocaleTimeString()}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
