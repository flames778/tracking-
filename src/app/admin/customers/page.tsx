"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminCustomersPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Customers</h1>
          <p className="text-slate-400">Manage organizations and billing.</p>
        </div>
        <Button className="bg-white text-slate-900 hover:bg-slate-200">
          <Plus className="mr-2 h-4 w-4" /> Add Customer
        </Button>
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">Customer Directory</CardTitle>
          <CardDescription className="text-slate-400">List of all active organizations</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-20">
          <Users className="h-12 w-12 text-slate-700 mb-4" />
          <p className="text-slate-400">Customer table will be rendered here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
