"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, Car, HardDrive, Activity } from "lucide-react";

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">System Overview</h1>
          <p className="text-slate-400">Platform-wide metrics and health status.</p>
        </div>
      </div>
      
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">128</div>
            <p className="text-xs text-slate-400">+4 this month</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Active Vehicles</CardTitle>
            <Car className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">1,492</div>
            <p className="text-xs text-slate-400">Across all organizations</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Online Devices</CardTitle>
            <HardDrive className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">1,405</div>
            <p className="text-xs text-slate-400">94.1% connection rate</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Tracking Server</CardTitle>
            <Activity className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">Stable</div>
            <p className="text-xs text-slate-400">99.99% uptime</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-slate-900 border-slate-800 min-h-[400px]">
          <CardHeader>
            <CardTitle className="text-white">Recent Installations</CardTitle>
            <CardDescription className="text-slate-400">Latest devices deployed to the field.</CardDescription>
          </CardHeader>
          <CardContent>
             <div className="text-sm text-slate-400 flex items-center justify-center h-40">
               Data grid placeholder
             </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800 min-h-[400px]">
          <CardHeader>
            <CardTitle className="text-white">System Events</CardTitle>
            <CardDescription className="text-slate-400">Critical platform logs.</CardDescription>
          </CardHeader>
          <CardContent>
             <div className="text-sm text-slate-400 flex items-center justify-center h-40">
               Log stream placeholder
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
