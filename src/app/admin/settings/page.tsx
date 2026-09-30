"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Settings as SettingsIcon } from "lucide-react";

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Platform Settings</h1>
          <p className="text-slate-400">Configure global platform behavior.</p>
        </div>
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">Global Configuration</CardTitle>
          <CardDescription className="text-slate-400">Manage environment variables and integrations</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-20">
          <SettingsIcon className="h-12 w-12 text-slate-700 mb-4" />
          <p className="text-slate-400">Configuration forms will be rendered here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
