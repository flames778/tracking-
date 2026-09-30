"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">Generate useful fleet and vehicle performance reports.</p>
        </div>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[
          { title: "Vehicle Activity", desc: "Detailed breakdown of daily movement and engine hours." },
          { title: "Trip Summary", desc: "Aggregated distance and duration for selected vehicles." },
          { title: "Fleet Performance", desc: "High-level overview of fleet utilization." },
          { title: "Alert History", desc: "Exportable log of all triggered events and geofence breaches." },
          { title: "Fuel Consumption", desc: "Detailed fuel usage and refill logs." },
        ].map((report, i) => (
          <Card key={i}>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                {report.title}
              </CardTitle>
              <CardDescription>{report.desc}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full">
                <Download className="mr-2 h-4 w-4" /> Generate Report
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
