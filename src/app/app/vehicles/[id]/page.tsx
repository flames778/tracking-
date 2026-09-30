"use client";

import { useParams } from "next/navigation";
import { useFleetStore } from "@/store/useFleetStore";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Map, Activity, Power, Fuel, Battery, History, Bell, Navigation } from "lucide-react";
import Link from "next/link";
import { FleetMap } from "@/components/dashboard/FleetMap";
import { useEffect } from "react";

export default function VehicleDetailsPage() {
  const params = useParams();
  const id = params.id as string;
  const { vehicles, telemetry, selectVehicle } = useFleetStore();

  const vehicle = vehicles.find(v => v.id === id);
  const data = telemetry[id];

  useEffect(() => {
    // Select this vehicle on mount to center the map on it
    selectVehicle(id);
    return () => selectVehicle(null);
  }, [id, selectVehicle]);

  if (!vehicle) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <h2 className="text-2xl font-bold mb-2">Vehicle Not Found</h2>
        <p className="text-muted-foreground mb-4">The vehicle you are looking for does not exist.</p>
        <Link href="/app/vehicles">
          <Button>Back to Vehicles</Button>
        </Link>
      </div>
    );
  }

  const isOnline = data?.connectionStatus === 'online';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-end">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-bold tracking-tight">{vehicle.name}</h1>
            <Badge variant={isOnline ? 'default' : 'destructive'}>
              {isOnline ? 'Online' : 'Offline'}
            </Badge>
          </div>
          <div className="text-muted-foreground flex gap-4 text-sm font-medium">
            <span>REG: {vehicle.registrationNumber}</span>
            <span>TYPE: {vehicle.type}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/app/live-map?v=${vehicle.id}`}>
            <Button variant="outline">
              <Map className="mr-2 h-4 w-4" /> Live Map
            </Button>
          </Link>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="live">Live Telemetry</TabsTrigger>
          <TabsTrigger value="trips">Trips</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          {vehicle.hasFuelSensor && <TabsTrigger value="fuel">Fuel</TabsTrigger>}
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-6 flex flex-col justify-center items-center text-center space-y-2">
                <Activity className="h-8 w-8 text-primary mb-2" />
                <div className="text-sm font-medium text-muted-foreground">Current Speed</div>
                <div className="text-3xl font-bold">{data ? Math.round(data.speed) : 0} <span className="text-lg font-normal text-muted-foreground">km/h</span></div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 flex flex-col justify-center items-center text-center space-y-2">
                <Power className={`h-8 w-8 mb-2 ${data?.ignition ? 'text-green-500' : 'text-muted-foreground'}`} />
                <div className="text-sm font-medium text-muted-foreground">Ignition</div>
                <div className="text-3xl font-bold">{data?.ignition ? 'ON' : 'OFF'}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 flex flex-col justify-center items-center text-center space-y-2">
                <Battery className="h-8 w-8 text-amber-500 mb-2" />
                <div className="text-sm font-medium text-muted-foreground">Battery</div>
                <div className="text-3xl font-bold">{data?.batteryVoltage ? data.batteryVoltage.toFixed(1) : '-'} <span className="text-lg font-normal text-muted-foreground">V</span></div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 flex flex-col justify-center items-center text-center space-y-2">
                <Fuel className="h-8 w-8 text-blue-500 mb-2" />
                <div className="text-sm font-medium text-muted-foreground">Fuel Level</div>
                <div className="text-3xl font-bold">
                  {vehicle.hasFuelSensor && data?.fuel ? Math.round(data.fuel.percentage) : 'N/A'}
                  {vehicle.hasFuelSensor && <span className="text-lg font-normal text-muted-foreground">%</span>}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="flex flex-col">
              <CardHeader>
                <CardTitle>Current Location</CardTitle>
                <CardDescription>
                  {data ? `Last updated: ${new Date(data.timestamp).toLocaleTimeString()}` : 'Waiting for telemetry...'}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 p-0 overflow-hidden min-h-[300px]">
                <FleetMap className="w-full h-full rounded-b-xl" />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Device Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-y-4 text-sm">
                  <div>
                    <div className="text-muted-foreground mb-1">Tracker Model</div>
                    <div className="font-medium">C003F GPS Tracker</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-1">Odometer</div>
                    <div className="font-medium">{data?.odometer ? `${Math.round(data.odometer).toLocaleString()} km` : '-'}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-1">Heading</div>
                    <div className="font-medium flex items-center gap-2">
                      {data?.heading ? Math.round(data.heading) : '-'}° 
                      {data && <Navigation className="h-3 w-3" style={{ transform: `rotate(${data.heading}deg)` }} />}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-1">Added On</div>
                    <div className="font-medium">{new Date(vehicle.createdAt).toLocaleDateString()}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="live">
          <Card>
            <CardHeader>
              <CardTitle>Raw Telemetry Stream</CardTitle>
              <CardDescription>Real-time data stream directly from the device</CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded-md overflow-x-auto text-xs text-primary font-mono border border-border">
                {data ? JSON.stringify(data, null, 2) : 'No data available'}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trips">
          <Card>
            <CardHeader>
              <CardTitle>Recent Trips</CardTitle>
              <CardDescription>Vehicle journey history</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <History className="h-12 w-12 mb-4 opacity-20" />
              <p>No trips recorded for this period.</p>
              <Button variant="outline" className="mt-4">Generate Report</Button>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="alerts">
          <Card>
            <CardHeader>
              <CardTitle>Vehicle Alerts</CardTitle>
              <CardDescription>Recent events and notifications</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Bell className="h-12 w-12 mb-4 opacity-20" />
              <p>No active alerts for this vehicle.</p>
            </CardContent>
          </Card>
        </TabsContent>
        
        {vehicle.hasFuelSensor && (
          <TabsContent value="fuel">
            <Card>
              <CardHeader>
                <CardTitle>Fuel Analysis</CardTitle>
                <CardDescription>Consumption and refill history</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Fuel className="h-12 w-12 mb-4 opacity-20" />
                <p>Fuel charts requires more historical data to generate insights.</p>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
