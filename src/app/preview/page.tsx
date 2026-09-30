"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowRight, Map, LayoutDashboard, Car, Bell, Shield, Fuel,
  FileText, Settings, ChevronLeft, ChevronRight, ExternalLink,
  Navigation2, Activity, Wifi, WifiOff, AlertTriangle, Power, Battery
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// --- Simulated live data for the demo ---
function useLiveSim() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1500);
    return () => clearInterval(id);
  }, []);

  const speed1 = 45 + Math.round(Math.sin(tick * 0.3) * 20);
  const speed2 = 70 + Math.round(Math.cos(tick * 0.25) * 25);
  const speed3 = 30 + Math.round(Math.sin(tick * 0.4 + 1) * 15);
  const fuel1 = 72 - (tick * 0.01);
  const online = tick % 20 < 17; // vehicle 3 occasionally goes offline

  return { speed1, speed2, speed3, fuel1: Math.max(20, fuel1), online, tick };
}

// --- Individual preview screens ---

function LandingPreview() {
  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-primary/10 to-background overflow-hidden">
      <div className="h-10 bg-card border-b border-border flex items-center px-4 gap-3 text-xs text-muted-foreground font-mono">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
        </div>
        fleettrack.com
      </div>
      <div className="flex-1 p-6 flex flex-col items-center justify-center text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary mb-4">
          <span className="flex h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          Real-time Fleet Tracking
        </div>
        <h2 className="text-2xl font-extrabold mb-3">Know Where Your Vehicles Are.<br /><span className="text-primary">Stay in Control.</span></h2>
        <p className="text-sm text-muted-foreground max-w-xs mb-6">Real-time tracking, fuel monitoring and smart alerts — all from one platform.</p>
        <div className="flex gap-3">
          <div className="bg-primary text-primary-foreground text-xs font-semibold px-4 py-2 rounded-lg">Get Started</div>
          <div className="border border-border text-xs font-semibold px-4 py-2 rounded-lg">View Demo</div>
        </div>
      </div>
    </div>
  );
}

function DashboardPreview() {
  const { speed1, speed2, online, tick } = useLiveSim();
  const onlineCount = online ? 4 : 3;
  const offlineCount = online ? 1 : 2;
  const alerts = tick % 6 === 0 ? 3 : tick % 6 === 3 ? 4 : 2;

  return (
    <div className="h-full flex bg-background overflow-hidden text-xs">
      {/* Mini sidebar */}
      <div className="w-28 bg-card border-r border-border flex flex-col py-3 px-2 gap-0.5 flex-shrink-0">
        <div className="flex items-center gap-1.5 px-2 py-2 mb-3">
          <div className="w-5 h-5 rounded bg-primary flex items-center justify-center"><Navigation2 className="h-3 w-3 text-white fill-white" /></div>
          <span className="font-bold text-[11px]">FleetTrack</span>
        </div>
        {[
          { icon: LayoutDashboard, name: "Dashboard", active: true },
          { icon: Map, name: "Live Map" },
          { icon: Car, name: "Vehicles" },
          { icon: Bell, name: "Alerts", badge: alerts },
          { icon: Shield, name: "Geofences" },
          { icon: Fuel, name: "Fuel" },
        ].map((item, i) => (
          <div key={i} className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-default ${item.active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>
            <item.icon className="h-3 w-3 flex-shrink-0" />
            <span className="text-[10px] truncate">{item.name}</span>
            {item.badge ? <span className="ml-auto bg-destructive text-destructive-foreground rounded-full w-4 h-4 flex items-center justify-center text-[9px] font-bold">{item.badge}</span> : null}
          </div>
        ))}
      </div>

      {/* Dashboard content */}
      <div className="flex-1 p-3 flex flex-col gap-3 overflow-hidden min-w-0">
        <div className="flex justify-between items-center">
          <span className="font-bold text-sm">Overview</span>
          <div className="flex items-center gap-1.5 bg-amber-500/10 text-amber-500 text-[10px] font-semibold px-2 py-1 rounded-full border border-amber-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            DEMO
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "Total", value: "5", icon: Car, color: "" },
            { label: "Online", value: String(onlineCount), icon: Wifi, color: "text-green-500" },
            { label: "Offline", value: String(offlineCount), icon: WifiOff, color: "text-destructive" },
            { label: "Alerts", value: String(alerts), icon: AlertTriangle, color: "text-amber-500" },
          ].map((s, i) => (
            <div key={i} className="bg-card border border-border rounded-lg p-2">
              <div className="text-muted-foreground text-[9px] mb-1">{s.label}</div>
              <div className={`text-lg font-bold ${s.color}`}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Map area */}
        <div className="flex-1 bg-muted/30 rounded-lg border border-border relative overflow-hidden min-h-0">
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)", backgroundSize: "18px 18px" }}
          />
          {/* Animated vehicles */}
          <div className="absolute w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow-lg border-2 border-background transition-all duration-1000"
            style={{ top: `${25 + Math.sin(tick * 0.3) * 8}%`, left: `${30 + Math.cos(tick * 0.2) * 8}%` }}>
            <Navigation2 className="h-3 w-3 text-white fill-white" />
          </div>
          <div className="absolute w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-lg border-2 border-background transition-all duration-1000"
            style={{ top: `${45 + Math.cos(tick * 0.25) * 10}%`, left: `${55 + Math.sin(tick * 0.35) * 12}%` }}>
            <Navigation2 className="h-3 w-3 text-white fill-white" />
          </div>
          <div className={`absolute w-6 h-6 rounded-full flex items-center justify-center shadow-lg border-2 border-background transition-all duration-1000 ${online ? "bg-amber-500" : "bg-muted-foreground"}`}
            style={{ top: `${62 + Math.sin(tick * 0.4) * 6}%`, left: `${25 + Math.cos(tick * 0.3) * 6}%` }}>
            <Navigation2 className="h-3 w-3 text-white fill-white" />
          </div>
          <div className="absolute bottom-2 right-2 bg-card/90 border border-border rounded-md px-2 py-1 text-[9px] text-muted-foreground backdrop-blur">
            {onlineCount} vehicles live
          </div>
        </div>
      </div>
    </div>
  );
}

function LiveMapPreview() {
  const { speed1, speed2, speed3, fuel1, online, tick } = useLiveSim();

  return (
    <div className="h-full flex bg-background overflow-hidden text-xs">
      {/* Vehicle list sidebar */}
      <div className="w-36 bg-card border-r border-border flex flex-col flex-shrink-0">
        <div className="p-2 border-b border-border">
          <span className="font-semibold text-[11px]">Vehicle Status</span>
        </div>
        <div className="flex-1 overflow-y-auto p-1 space-y-1">
          {[
            { name: "Toyota Camry", reg: "KJA-123XD", speed: speed1, online: true, ignition: true },
            { name: "Toyota Hilux", reg: "LND-456YY", speed: speed2, online: true, ignition: true },
            { name: "Mercedes", reg: "ABJ-789ZZ", speed: speed3, online, ignition: online },
            { name: "Honda Accord", reg: "EKY-321AA", speed: 0, online: true, ignition: false },
          ].map((v, i) => (
            <div key={i} className={`p-2 rounded-md border ${i === 0 ? "border-primary/40 bg-primary/5" : "border-transparent hover:bg-muted"}`}>
              <div className="flex justify-between items-start mb-1">
                <span className="font-medium text-[10px] leading-tight">{v.name}</span>
                <div className={`w-1.5 h-1.5 rounded-full mt-0.5 flex-shrink-0 ${v.online ? "bg-green-500" : "bg-destructive"}`} />
              </div>
              <div className="text-muted-foreground text-[9px]">{Math.round(v.speed)} km/h</div>
            </div>
          ))}
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 bg-muted/20 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)", backgroundSize: "20px 20px" }}
        />

        {/* Animated markers */}
        <div className="absolute w-7 h-7 bg-primary rounded-full flex items-center justify-center shadow-xl border-2 border-background transition-all duration-1000"
          style={{ top: `${20 + Math.sin(tick * 0.3) * 10}%`, left: `${20 + Math.cos(tick * 0.2) * 12}%` }}>
          <Navigation2 className="h-3.5 w-3.5 text-white fill-white" />
        </div>
        <div className="absolute w-7 h-7 bg-green-500 rounded-full flex items-center justify-center shadow-xl border-2 border-background transition-all duration-1000"
          style={{ top: `${40 + Math.cos(tick * 0.25) * 12}%`, left: `${50 + Math.sin(tick * 0.35) * 15}%` }}>
          <Navigation2 className="h-3.5 w-3.5 text-white fill-white" />
        </div>
        <div className={`absolute w-7 h-7 rounded-full flex items-center justify-center shadow-xl border-2 border-background transition-all duration-1000 ${online ? "bg-amber-500" : "bg-muted-foreground"}`}
          style={{ top: `${60 + Math.sin(tick * 0.4) * 8}%`, left: `${30 + Math.cos(tick * 0.3) * 8}%` }}>
          <Navigation2 className="h-3.5 w-3.5 text-white fill-white" />
        </div>

        {/* Selected vehicle popup */}
        <div className="absolute bg-card border border-border rounded-lg shadow-xl p-3 w-40 transition-all duration-500"
          style={{ top: `${Math.max(5, 20 + Math.sin(tick * 0.3) * 10 - 22)}%`, left: `${Math.min(55, 20 + Math.cos(tick * 0.2) * 12 + 5)}%` }}>
          <div className="flex justify-between items-start mb-1">
            <span className="font-bold text-[11px]">Toyota Camry</span>
            <span className="text-[9px] text-green-500 font-medium">Online</span>
          </div>
          <div className="text-[9px] text-muted-foreground mb-2">KJA-123XD</div>
          <div className="grid grid-cols-2 gap-1">
            <div className="text-[9px]"><span className="text-muted-foreground">Speed </span><strong>{Math.round(speed1)} km/h</strong></div>
            <div className="text-[9px]"><span className="text-muted-foreground">Fuel </span><strong>{Math.round(fuel1)}%</strong></div>
            <div className="text-[9px]"><span className="text-muted-foreground">Ign </span><strong className="text-green-500">ON</strong></div>
            <div className="text-[9px]"><span className="text-muted-foreground">Batt </span><strong>12.6V</strong></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function VehiclesPreview() {
  const { speed1, speed2, speed3, fuel1, online, tick } = useLiveSim();
  const rows = [
    { name: "Toyota Camry", reg: "KJA-123XD", speed: speed1, fuel: fuel1, ignition: true, online: true, battery: 12.6 },
    { name: "Toyota Hilux", reg: "LND-456YY", speed: speed2, fuel: 58, ignition: true, online: true, battery: 12.1 },
    { name: "Mercedes Sprinter", reg: "ABJ-789ZZ", speed: 0, fuel: null, ignition: false, online, battery: 11.8 },
    { name: "Honda Accord", reg: "EKY-321AA", speed: speed3, fuel: 82, ignition: true, online: true, battery: 13.0 },
    { name: "Toyota Hiace", reg: "AAA-999BB", speed: 0, fuel: 30, ignition: false, online: true, battery: 12.4 },
  ];

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden text-[11px]">
      <div className="p-3 border-b border-border flex items-center justify-between">
        <span className="font-bold text-sm">Vehicles</span>
        <div className="h-7 bg-primary text-primary-foreground text-xs font-semibold px-3 rounded-md flex items-center">+ Add Vehicle</div>
      </div>
      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {["Vehicle", "Status", "Speed", "Fuel", "Ign", "Battery", "Updated"].map(h => (
                <th key={h} className="text-left px-3 py-2 text-[10px] font-medium text-muted-foreground whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((v, i) => (
              <tr key={i} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                <td className="px-3 py-2">
                  <div className="font-medium text-primary">{v.name}</div>
                  <div className="text-[9px] text-muted-foreground">{v.reg}</div>
                </td>
                <td className="px-3 py-2">
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${v.online ? "bg-green-500/15 text-green-600" : "bg-destructive/15 text-destructive"}`}>
                    {v.online ? "Online" : "Offline"}
                  </span>
                </td>
                <td className="px-3 py-2 font-medium">{Math.round(v.speed)} <span className="text-muted-foreground">km/h</span></td>
                <td className="px-3 py-2">{v.fuel != null ? `${Math.round(v.fuel)}%` : <span className="text-muted-foreground">N/A</span>}</td>
                <td className="px-3 py-2">
                  <span className={`font-medium ${v.ignition ? "text-green-500" : "text-muted-foreground"}`}>{v.ignition ? "ON" : "OFF"}</span>
                </td>
                <td className="px-3 py-2">{v.battery.toFixed(1)}V</td>
                <td className="px-3 py-2 text-muted-foreground text-[9px]">{Math.round(Math.random() * 10 + 1)}s ago</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AlertsPreview() {
  const { tick } = useLiveSim();
  const events = [
    { severity: "Critical", type: "Overspeeding", vehicle: "Toyota Camry", msg: "Exceeded 100 km/h (112 km/h)", time: "09:42" },
    { severity: "Warning", type: "Geofence", vehicle: "Bus 04", msg: "Left School Zone boundary", time: "09:37" },
    { severity: "Critical", type: "Device Offline", vehicle: "Mercedes Sprinter", msg: "No signal for 15 minutes", time: "09:31" },
    { severity: "Info", type: "Ignition", vehicle: "Honda Accord", msg: "Engine started at Yaba depot", time: "09:22" },
    { severity: "Warning", type: "Fuel Event", vehicle: "Vehicle 03", msg: "Unusual fuel drop detected (−18%)", time: "09:14" },
  ];
  // Add a new alert every few ticks for demo
  const extra = tick > 3 ? [{ severity: "Critical", type: "Overspeeding", vehicle: "Toyota Hilux", msg: `Exceeded 100 km/h (${102 + (tick % 15)} km/h)`, time: "Now" }] : [];
  const all = [...extra, ...events].slice(0, 5);

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden text-[11px]">
      <div className="p-3 border-b border-border">
        <span className="font-bold text-sm">Alerts</span>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {all.map((a, i) => {
          const colors: Record<string, string> = {
            Critical: "bg-destructive/10 text-destructive border-destructive/20",
            Warning: "bg-amber-500/10 text-amber-500 border-amber-500/20",
            Info: "bg-blue-500/10 text-blue-500 border-blue-500/20",
          };
          return (
            <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border transition-all duration-500 ${i === 0 && extra.length ? "animate-pulse" : ""} ${i === 0 ? "bg-card shadow-sm" : "bg-muted/30 border-transparent"}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center border flex-shrink-0 ${colors[a.severity]}`}>
                <AlertTriangle className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-semibold truncate">{a.vehicle}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded border ${colors[a.severity]}`}>{a.type}</span>
                </div>
                <p className="text-muted-foreground text-[10px] leading-tight">{a.msg}</p>
                <span className="text-[9px] text-muted-foreground">{a.time}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AdminPreview() {
  return (
    <div className="h-full flex bg-slate-950 text-slate-200 overflow-hidden text-[11px]">
      {/* Admin sidebar */}
      <div className="w-32 bg-slate-900 border-r border-slate-800 flex flex-col py-3 px-2 gap-0.5 flex-shrink-0">
        <div className="flex items-center gap-1.5 px-2 py-2 mb-3">
          <div className="w-5 h-5 rounded bg-red-600 flex items-center justify-center"><Shield className="h-3 w-3 text-white" /></div>
          <span className="font-bold text-[10px] text-white">SuperAdmin</span>
        </div>
        {[
          { icon: LayoutDashboard, name: "Dashboard", active: true },
          { icon: Car, name: "Customers" },
          { icon: Activity, name: "Devices" },
          { icon: Settings, name: "Installs" },
          { icon: FileText, name: "Logs" },
        ].map((item, i) => (
          <div key={i} className={`flex items-center gap-2 px-2 py-1.5 rounded-md ${item.active ? "bg-slate-700 text-white" : "text-slate-400"}`}>
            <item.icon className="h-3 w-3 flex-shrink-0" />
            <span className="text-[10px]">{item.name}</span>
          </div>
        ))}
      </div>

      {/* Admin content */}
      <div className="flex-1 p-3 flex flex-col gap-3 overflow-hidden bg-slate-950">
        <div className="flex items-center justify-between">
          <span className="font-bold text-sm text-white">System Overview</span>
          <div className="text-[9px] bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded font-mono">PRODUCTION ENV</div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "Customers", value: "128", color: "text-white" },
            { label: "Vehicles", value: "1,492", color: "text-white" },
            { label: "Online", value: "1,405", color: "text-green-400" },
            { label: "Server", value: "Stable", color: "text-green-400" },
          ].map((s, i) => (
            <div key={i} className="bg-slate-900 border border-slate-800 rounded-lg p-2">
              <div className="text-slate-500 text-[9px] mb-1">{s.label}</div>
              <div className={`text-base font-bold ${s.color}`}>{s.value}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2 flex-1 min-h-0">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-2 flex flex-col">
            <div className="text-[10px] font-semibold text-slate-300 mb-2">Recent Installations</div>
            {["C003F → Camry RE291", "C003F → Hilux MH889", "C003F → Sprinter KL02"].map((r, i) => (
              <div key={i} className="text-[9px] text-slate-400 py-1 border-b border-slate-800">{r}</div>
            ))}
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-2 flex flex-col">
            <div className="text-[10px] font-semibold text-slate-300 mb-2">System Events</div>
            {["Device KJA-001 connected", "User login: admin", "Geofence created: Zone A"].map((r, i) => (
              <div key={i} className="text-[9px] text-slate-400 py-1 border-b border-slate-800">{r}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Main Preview Component ---

const screens = [
  { key: "landing", label: "Landing Page", icon: Navigation2, component: LandingPreview, route: "/" },
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, component: DashboardPreview, route: "/app" },
  { key: "livemap", label: "Live Map", icon: Map, component: LiveMapPreview, route: "/app/live-map" },
  { key: "vehicles", label: "Vehicles", icon: Car, component: VehiclesPreview, route: "/app/vehicles" },
  { key: "alerts", label: "Alerts", icon: Bell, component: AlertsPreview, route: "/app/alerts" },
  { key: "admin", label: "Admin Panel", icon: Shield, component: AdminPreview, route: "/admin" },
];

export default function PreviewPage() {
  const [active, setActive] = useState(0);
  const [autoplay, setAutoplay] = useState(false);

  useEffect(() => {
    if (!autoplay) return;
    const id = setInterval(() => {
      setActive(i => (i + 1) % screens.length);
    }, 4000);
    return () => clearInterval(id);
  }, [autoplay]);

  const current = screens[active];
  const Screen = current.component;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <div className="border-b border-border bg-card px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Live Preview</h1>
          <p className="text-sm text-muted-foreground">Interactive walkthrough of the FleetTrack platform</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant={autoplay ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoplay(p => !p)}
          >
            {autoplay ? "⏸ Pause" : "▶ Autoplay"}
          </Button>
          <Link href={current.route} target="_blank">
            <Button variant="outline" size="sm">
              <ExternalLink className="h-4 w-4 mr-2" /> Open Live
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-0 overflow-hidden">
        {/* Screen selector */}
        <div className="lg:w-56 flex lg:flex-col gap-1 p-4 border-b lg:border-b-0 lg:border-r border-border bg-card/50 overflow-x-auto lg:overflow-y-auto flex-shrink-0">
          <div className="hidden lg:block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">Screens</div>
          {screens.map((s, i) => (
            <button
              key={s.key}
              onClick={() => { setActive(i); setAutoplay(false); }}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors flex-shrink-0 lg:flex-shrink text-left w-full ${active === i
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
            >
              <s.icon className="h-4 w-4 flex-shrink-0" />
              <span className="whitespace-nowrap lg:whitespace-normal">{s.label}</span>
              {active === i && autoplay && (
                <span className="ml-auto hidden lg:block">
                  <span className="flex h-2 w-2 rounded-full bg-primary-foreground/80 animate-pulse" />
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Preview area */}
        <div className="flex-1 p-4 lg:p-8 flex flex-col gap-4 overflow-hidden">
          {/* Screen title + nav */}
          <div className="flex items-center justify-between">
            <div>
              <Badge variant="outline" className="mb-2 text-xs font-mono">{current.route}</Badge>
              <h2 className="text-xl font-bold">{current.label}</h2>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => { setActive((active - 1 + screens.length) % screens.length); setAutoplay(false); }}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => { setActive((active + 1) % screens.length); setAutoplay(false); }}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Browser frame */}
          <div className="flex-1 rounded-2xl border-2 border-border shadow-2xl overflow-hidden flex flex-col min-h-0" style={{ minHeight: "480px" }}>
            {/* Browser chrome */}
            <div className="h-10 bg-muted/80 border-b border-border flex items-center px-4 gap-3 flex-shrink-0">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400/90" />
                <div className="w-3 h-3 rounded-full bg-yellow-400/90" />
                <div className="w-3 h-3 rounded-full bg-green-400/90" />
              </div>
              <div className="flex-1 max-w-xs h-6 bg-background/60 rounded text-xs flex items-center px-3 text-muted-foreground font-mono gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500/80 flex-shrink-0" />
                localhost:3000{current.route}
              </div>
            </div>

            {/* Page content */}
            <div className="flex-1 overflow-hidden">
              <Screen />
            </div>
          </div>

          {/* Progress dots */}
          <div className="flex items-center justify-center gap-2">
            {screens.map((_, i) => (
              <button
                key={i}
                onClick={() => { setActive(i); setAutoplay(false); }}
                className={`h-2 rounded-full transition-all duration-300 ${active === i ? "bg-primary w-6" : "bg-muted-foreground/30 hover:bg-muted-foreground/50 w-2"}`}
                aria-label={`Go to screen ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="border-t border-border bg-card px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-sm text-muted-foreground">
          🟡 <strong>Demo Mode</strong> — All data is simulated. Vehicle telemetry updates every 1.5 seconds.
        </div>
        <div className="flex gap-3">
          <Link href="/app">
            <Button>
              Open Dashboard <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link href="/">
            <Button variant="outline">Back to Home</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
