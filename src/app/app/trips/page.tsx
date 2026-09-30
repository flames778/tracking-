"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Route, Play } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TripsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Trip History</h1>
          <p className="text-muted-foreground">Review previous journeys and routes.</p>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Trip Simulator</CardTitle>
          <CardDescription>Select a date range to generate simulated trip histories</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Route className="h-16 w-16 mb-6 opacity-20" />
          <h3 className="text-xl font-medium mb-2 text-foreground">No trips found for this period</h3>
          <p className="mb-6 text-center max-w-sm">Use the trip simulator to generate historical playback data for the selected date range.</p>
          <Button variant="outline"><Play className="mr-2 h-4 w-4" /> Start Simulator</Button>
        </CardContent>
      </Card>
    </div>
  );
}
