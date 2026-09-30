"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Shield, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GeofencesPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Geofences</h1>
          <p className="text-muted-foreground">Create virtual boundaries and receive entry/exit notifications.</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Create Geofence
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Active Zones</CardTitle>
          <CardDescription>Manage your geographic rules</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Shield className="h-16 w-16 mb-6 opacity-20" />
          <h3 className="text-xl font-medium mb-2 text-foreground">No geofences created</h3>
          <p className="mb-6 text-center max-w-sm">Draw a polygon or circle on the map to define a monitored zone.</p>
          <Button variant="outline"><Plus className="mr-2 h-4 w-4" /> Draw on Map</Button>
        </CardContent>
      </Card>
    </div>
  );
}
