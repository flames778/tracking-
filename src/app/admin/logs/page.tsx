"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FileClock, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminLogsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">System Logs</h1>
          <p className="text-slate-400">Audit trail of all platform activity.</p>
        </div>
        <Button variant="outline" className="text-slate-300 border-slate-700 hover:bg-slate-800 hover:text-white">
          <Download className="mr-2 h-4 w-4" /> Export Logs
        </Button>
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">Raw Event Stream</CardTitle>
          <CardDescription className="text-slate-400">Logins, device connections, and admin actions</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-20">
          <FileClock className="h-12 w-12 text-slate-700 mb-4" />
          <p className="text-slate-400">Log viewer will be rendered here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
