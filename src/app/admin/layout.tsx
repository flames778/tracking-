import Link from "next/link";
import { ShieldAlert, Users, HardDrive, Wrench, FileClock, LayoutDashboard, Settings, LogOut, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-950 text-slate-50">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 border-r border-slate-800 bg-slate-900 hidden md:flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-slate-800">
          <Link href="/admin" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-600">
              <ShieldAlert className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">SuperAdmin</span>
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto py-4">
          <div className="px-4 mb-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Management</p>
          </div>
          <nav className="space-y-1 px-3">
            {[
              { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
              { name: "Customers", href: "/admin/customers", icon: Users },
              { name: "Devices (C003F)", href: "/admin/devices", icon: HardDrive },
              { name: "Installations", href: "/admin/installations", icon: Wrench },
              { name: "System Logs", href: "/admin/logs", icon: FileClock },
              { name: "Settings", href: "/admin/settings", icon: Settings },
            ].map((item) => (
              <Link key={item.name} href={item.href} className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            ))}
          </nav>
        </div>
        <div className="p-4 border-t border-slate-800">
          <Link href="/app" className="flex items-center gap-3 px-3 py-2 text-sm text-slate-400 hover:text-white transition-colors">
            <LogOut className="h-4 w-4" />
            Exit Admin Mode
          </Link>
        </div>
      </aside>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-16 flex-shrink-0 border-b border-slate-800 bg-slate-900 flex items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-4">
             <div className="relative w-64 hidden sm:block">
               <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
               <Input 
                 placeholder="Global search (IMEI, User)..." 
                 className="pl-9 bg-slate-800 border-slate-700 text-slate-200 placeholder:text-slate-500 focus-visible:ring-red-500" 
               />
             </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-xs px-2 py-1 bg-red-500/10 text-red-500 border border-red-500/20 rounded-md font-mono">
              PRODUCTION ENV
            </div>
          </div>
        </header>
        
        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-slate-950 text-slate-200">
          {children}
        </main>
      </div>
    </div>
  );
}
