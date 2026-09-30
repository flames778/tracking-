"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useFleetStore } from "@/store/useFleetStore";
import {
  LayoutDashboard, Map, Car, Route, Bell, Shield, Fuel,
  FileText, Settings, LogOut, MapPin, Moon, Sun, ChevronLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { name: "Dashboard", href: "/app", icon: LayoutDashboard, exact: true },
  { name: "Live Map", href: "/app/live-map", icon: Map },
  { name: "Vehicles", href: "/app/vehicles", icon: Car },
  { name: "Trips", href: "/app/trips", icon: Route },
  { name: "Alerts", href: "/app/alerts", icon: Bell, badge: true },
  { name: "Geofences", href: "/app/geofences", icon: Shield },
  { name: "Fuel", href: "/app/fuel", icon: Fuel },
  { name: "Reports", href: "/app/reports", icon: FileText },
  { name: "Settings", href: "/app/settings", icon: Settings },
];

export function AppSidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { alerts } = useFleetStore();
  const unreadAlerts = alerts.filter(a => !a.isRead).length;

  useEffect(() => setMounted(true), []);

  const isActive = (item: typeof navItems[0]) => {
    if (item.exact) return pathname === item.href;
    return pathname.startsWith(item.href);
  };

  return (
    <aside className={cn(
      "flex-shrink-0 border-r border-border bg-card flex-col hidden md:flex transition-all duration-300 relative",
      collapsed ? "w-16" : "w-64"
    )}>
      {/* Logo */}
      <div className={cn("h-16 flex items-center border-b border-border flex-shrink-0 overflow-hidden", collapsed ? "px-4 justify-center" : "px-6")}>
        <Link href="/" className="flex items-center gap-2 min-w-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary flex-shrink-0">
            <MapPin className="h-5 w-5 text-primary-foreground" />
          </div>
          {!collapsed && <span className="text-xl font-bold tracking-tight truncate">FleetTrack</span>}
        </Link>
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="space-y-1 px-2">
          {navItems.map((item) => {
            const active = isActive(item);
            return (
              <Link
                key={item.name}
                href={item.href}
                title={collapsed ? item.name : undefined}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors relative",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  collapsed && "justify-center"
                )}
              >
                <item.icon className="h-4 w-4 flex-shrink-0" />
                {!collapsed && <span className="truncate">{item.name}</span>}
                {item.badge && unreadAlerts > 0 && (
                  <span className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
                    active ? "bg-primary-foreground text-primary" : "bg-destructive text-destructive-foreground",
                    collapsed ? "absolute top-1 right-1" : "ml-auto"
                  )}>
                    {unreadAlerts > 9 ? "9+" : unreadAlerts}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom */}
      <div className={cn("p-3 border-t border-border space-y-2", collapsed && "flex flex-col items-center")}>
        {mounted && (
          <Button
            variant="ghost"
            size={collapsed ? "icon" : "sm"}
            className={cn("w-full text-muted-foreground hover:text-foreground", !collapsed && "justify-start gap-3")}
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="h-4 w-4 flex-shrink-0" /> : <Moon className="h-4 w-4 flex-shrink-0" />}
            {!collapsed && <span className="text-sm">{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>}
          </Button>
        )}

        {!collapsed && (
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
              JD
            </div>
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-sm font-medium truncate">John Doe</span>
              <span className="text-xs text-muted-foreground truncate">Fleet Admin</span>
            </div>
            <Link href="/login" className="text-muted-foreground hover:text-destructive transition-colors" aria-label="Log out">
              <LogOut className="h-4 w-4" />
            </Link>
          </div>
        )}
        {collapsed && (
          <Link href="/login" className="text-muted-foreground hover:text-destructive transition-colors p-2 block" aria-label="Log out">
            <LogOut className="h-4 w-4" />
          </Link>
        )}
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-20 z-10 h-6 w-6 rounded-full border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shadow-sm"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        <ChevronLeft className={cn("h-3.5 w-3.5 transition-transform duration-300", collapsed && "rotate-180")} />
      </button>
    </aside>
  );
}
