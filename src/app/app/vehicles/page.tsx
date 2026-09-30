"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFleetStore } from "@/store/useFleetStore";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Filter, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function VehiclesPage() {
  const { vehicles, telemetry } = useFleetStore();
  const [search, setSearch] = useState("");
  const router = useRouter();

  const filteredVehicles = vehicles.filter(v =>
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    v.registrationNumber.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vehicles</h1>
          <p className="text-muted-foreground">Manage your fleet and monitor real-time status.</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Add Vehicle
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-card p-4 rounded-lg border border-border">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or registration..."
            className="pl-9 bg-background"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button variant="outline" className="w-full sm:w-auto">
          <Filter className="mr-2 h-4 w-4" /> Filters
        </Button>
      </div>

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vehicle</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Speed</TableHead>
              <TableHead>Fuel</TableHead>
              <TableHead>Ignition</TableHead>
              <TableHead>Battery</TableHead>
              <TableHead>Last Update</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredVehicles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  No vehicles found.
                </TableCell>
              </TableRow>
            ) : (
              filteredVehicles.map((vehicle) => {
                const data = telemetry[vehicle.id];
                const isOnline = data?.connectionStatus === "online";

                return (
                  <TableRow key={vehicle.id} className="hover:bg-muted/50">
                    <TableCell>
                      <Link href={`/app/vehicles/${vehicle.id}`} className="block">
                        <div className="font-medium text-primary hover:underline">{vehicle.name}</div>
                        <div className="text-xs text-muted-foreground">{vehicle.registrationNumber}</div>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant={isOnline ? "default" : "destructive"} className="font-normal text-[10px]">
                        {isOnline ? "Online" : "Offline"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {data ? <div className="text-sm font-medium">{Math.round(data.speed)} km/h</div>
                        : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      {data?.fuel ? <div className="text-sm">{Math.round(data.fuel.percentage)}%</div>
                        : <span className="text-muted-foreground text-xs">N/A</span>}
                    </TableCell>
                    <TableCell>
                      {data ? (
                        <div className={`text-sm font-medium ${data.ignition ? "text-green-500" : "text-muted-foreground"}`}>
                          {data.ignition ? "ON" : "OFF"}
                        </div>
                      ) : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      {data?.batteryVoltage ? <div className="text-sm">{data.batteryVoltage.toFixed(1)}V</div>
                        : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      {data ? (
                        <div className="text-xs text-muted-foreground">
                          {new Date(data.timestamp).toLocaleTimeString()}
                        </div>
                      ) : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          }
                        />
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => router.push(`/app/vehicles/${vehicle.id}`)}>
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => router.push(`/app/live-map`)}>
                            Locate on Map
                          </DropdownMenuItem>
                          <DropdownMenuItem>Edit Vehicle</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
