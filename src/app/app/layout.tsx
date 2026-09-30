"use client";

import { useState } from "react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import Link from "next/link";
import { Bell, MapPin, Menu } from "lucide-react";
import { useFleetStore } from "@/store/useFleetStore";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { alerts } = useFleetStore();
  const unread = alerts.filter(a => !a.isRead).length;

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop Sidebar */}
      <AppSidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(p => !p)} />

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        >
          <div className="w-64 h-full bg-card border-r border-border flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="h-16 flex items-center px-6 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                  <MapPin className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="text-xl font-bold">FleetTrack</span>
              </div>
            </div>
            <nav className="flex-1 p-3 space-y-1">
              {[
                { name: "Dashboard", href: "/app" },
                { name: "Live Map", href: "/app/live-map" },
                { name: "Vehicles", href: "/app/vehicles" },
                { name: "Trips", href: "/app/trips" },
                { name: "Alerts", href: "/app/alerts" },
                { name: "Geofences", href: "/app/geofences" },
                { name: "Fuel", href: "/app/fuel" },
                { name: "Reports", href: "/app/reports" },
                { name: "Settings", href: "/app/settings" },
              ].map(item => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="block px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                  onClick={() => setMobileOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-16 flex-shrink-0 border-b border-border bg-card flex items-center justify-between px-4 md:px-6 z-10">
          <div className="flex items-center gap-3">
            <button
              className="md:hidden p-2 rounded-md text-muted-foreground hover:text-foreground"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/app/alerts" className="relative p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" aria-label="Notifications">
              <Bell className="h-5 w-5" />
              {unread > 0 && (
                <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground font-bold">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </Link>
            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm md:hidden">
              JD
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
