import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  ArrowRight, Map, Activity, BarChart3, Bell,
  Fuel, Route, Shield, FileText, Navigation2,
  CheckCircle, Building, Bus, TruckIcon, Briefcase
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  { icon: Map, title: "Live GPS Tracking", desc: "Real-time vehicle location and movement with sub-second updates." },
  { icon: Activity, title: "Vehicle Monitoring", desc: "Monitor speed, ignition, battery voltage and connection status 24/7." },
  { icon: Fuel, title: "Fuel Monitoring", desc: "Track fuel levels when supported by an installed fuel sensor." },
  { icon: Route, title: "Trip History", desc: "Review previous journeys, routes and driver behaviour." },
  { icon: Bell, title: "Smart Alerts", desc: "Instant notifications for overspeeding, geofence breaches and device events." },
  { icon: Shield, title: "Geofencing", desc: "Create virtual boundaries and receive entry/exit notifications." },
  { icon: BarChart3, title: "Fleet Analytics", desc: "Understand fleet activity, utilisation and performance at a glance." },
  { icon: FileText, title: "Reports", desc: "Generate detailed fleet and vehicle reports exportable to CSV or PDF." },
];

const solutions = [
  { icon: Navigation2, title: "Personal Vehicles", desc: "Monitor your personal vehicles remotely from anywhere." },
  { icon: Bus, title: "Schools", desc: "Track school buses and student transport for safety." },
  { icon: Briefcase, title: "Businesses", desc: "Monitor company vehicles and operational fleets." },
  { icon: TruckIcon, title: "Logistics", desc: "Track delivery vehicles and optimise routes." },
  { icon: Bus, title: "Transport Companies", desc: "Manage buses and commercial passenger vehicles." },
  { icon: Building, title: "Fleet Operators", desc: "Monitor large vehicle fleets from a single unified platform." },
];

const pricingPlans = [
  {
    name: "Personal",
    price: "₦7,500",
    period: "/ month",
    desc: "Perfect for vehicle owners who want peace of mind.",
    features: ["1 vehicle", "Live tracking", "Trip history", "Basic alerts", "Geofencing"],
    cta: "Get Started",
    highlight: false,
  },
  {
    name: "Business",
    price: "₦15,000",
    period: "/ month",
    desc: "Ideal for small fleets and growing companies.",
    features: ["Up to 20 vehicles", "Fleet dashboard", "Advanced alerts", "Reports", "Fleet analytics", "Email support"],
    cta: "Start Free Trial",
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "pricing",
    desc: "Tailored for large fleets with complex needs.",
    features: ["Unlimited vehicles", "Fuel monitoring", "Advanced reporting", "Dedicated support", "Custom integrations", "SLA guarantee"],
    cta: "Contact Sales",
    highlight: false,
  },
];

export default function LandingPage() {
  return (
    <div className="flex flex-col items-center w-full">

      {/* ─── Hero ─── */}
      <section className="w-full py-24 md:py-36 lg:py-44 relative overflow-hidden">
        {/* Background grid */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background pointer-events-none" />
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{ backgroundImage: "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)", backgroundSize: "28px 28px" }}
        />

        <div className="relative z-10 max-w-7xl mx-auto px-4 text-center flex flex-col items-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </span>
            Now live — Real-time Fleet Tracking Platform
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight max-w-4xl leading-[1.08] mb-6">
            Know Where Your Vehicles Are.{" "}
            <span className="text-primary">Stay in Control.</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-10 leading-relaxed">
            Real-time vehicle tracking, fleet intelligence, fuel monitoring and smart alerts — all from one platform.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/register">
              <Button size="lg" className="h-12 px-8 text-base font-semibold">
                Get Started <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/app">
              <Button size="lg" variant="outline" className="h-12 px-8 text-base font-semibold">
                View Demo
              </Button>
            </Link>
          </div>

          {/* Dashboard Preview Mock */}
          <div className="mt-20 w-full max-w-5xl relative">
            <div className="absolute -inset-4 bg-primary/10 rounded-3xl blur-3xl" />
            <div className="relative bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
              {/* Browser chrome */}
              <div className="h-10 bg-muted/80 border-b border-border flex items-center px-4 gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400/80" />
                  <div className="w-3 h-3 rounded-full bg-green-400/80" />
                </div>
                <div className="flex-1 mx-4 h-6 bg-background/60 rounded text-xs flex items-center px-3 text-muted-foreground font-mono">
                  app.fleettrack.com/dashboard
                </div>
              </div>

              {/* Mini dashboard */}
              <div className="flex h-80 bg-background">
                {/* Sidebar preview */}
                <div className="w-48 bg-card border-r border-border p-3 hidden sm:block">
                  <div className="flex items-center gap-2 mb-6 px-1">
                    <div className="w-5 h-5 rounded bg-primary" />
                    <div className="h-3 w-20 bg-muted rounded" />
                  </div>
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className={`flex items-center gap-2 px-2 py-1.5 rounded mb-1 ${i === 0 ? "bg-primary/10" : ""}`}>
                      <div className={`w-3 h-3 rounded-sm ${i === 0 ? "bg-primary" : "bg-muted"}`} />
                      <div className={`h-2 rounded ${i === 0 ? "w-20 bg-primary/60" : "w-16 bg-muted"}`} />
                    </div>
                  ))}
                </div>

                {/* Content preview */}
                <div className="flex-1 p-4 space-y-3 overflow-hidden">
                  {/* Stats row */}
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: "Total", value: "24" },
                      { label: "Online", value: "21", green: true },
                      { label: "Offline", value: "3", red: true },
                      { label: "Alerts", value: "5", amber: true },
                    ].map((s, i) => (
                      <div key={i} className="bg-card border border-border rounded-lg p-2">
                        <div className="text-[10px] text-muted-foreground mb-1">{s.label}</div>
                        <div className={`text-lg font-bold ${s.green ? "text-green-500" : s.red ? "text-destructive" : s.amber ? "text-amber-500" : ""}`}>{s.value}</div>
                      </div>
                    ))}
                  </div>
                  {/* Map placeholder */}
                  <div className="flex-1 bg-muted/40 rounded-lg border border-border h-44 flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 opacity-10"
                      style={{ backgroundImage: "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)", backgroundSize: "20px 20px" }}
                    />
                    {/* Vehicle dots */}
                    <div className="absolute top-1/3 left-1/4 w-5 h-5 bg-primary rounded-full flex items-center justify-center shadow-lg shadow-primary/40">
                      <Navigation2 className="h-3 w-3 text-white fill-white" />
                    </div>
                    <div className="absolute top-1/2 left-1/2 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center shadow-lg shadow-green-500/40">
                      <Navigation2 className="h-3 w-3 text-white fill-white" />
                    </div>
                    <div className="absolute bottom-1/3 right-1/3 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center shadow-lg shadow-amber-500/40">
                      <Navigation2 className="h-3 w-3 text-white fill-white" />
                    </div>
                    <div className="z-10 text-xs text-muted-foreground bg-card/80 px-3 py-1.5 rounded-full border border-border backdrop-blur">
                      5 vehicles tracking live
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Trust Strip ─── */}
      <section className="w-full py-12 border-y border-border/50 bg-muted/20">
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-center text-sm text-muted-foreground mb-8 uppercase tracking-widest font-medium">One Platform. Complete Fleet Visibility.</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: Map, title: "Real-time Location", desc: "Track every movement as it happens." },
              { icon: Activity, title: "Vehicle Activity", desc: "Monitor speed, ignition and battery." },
              { icon: BarChart3, title: "Fleet Analytics", desc: "Deep insights into performance." },
              { icon: Bell, title: "Smart Alerts", desc: "Instant notifications for critical events." },
            ].map((item, i) => (
              <div key={i} className="flex flex-col items-center text-center p-4">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3 text-primary">
                  <item.icon className="h-6 w-6" />
                </div>
                <h3 className="font-semibold mb-1">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features ─── */}
      <section id="features" className="w-full py-24 bg-background">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything you need to run your fleet</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From live tracking to fuel analysis, FleetTrack gives you the tools to operate smarter.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => (
              <Card key={i} className="group border-border/60 transition-all duration-300 hover:shadow-lg hover:border-primary/30 hover:-translate-y-1">
                <CardContent className="p-6">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <f.icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold mb-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Solutions ─── */}
      <section className="w-full py-24 bg-muted/20 border-y border-border/50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Built for every fleet</h2>
            <p className="text-lg text-muted-foreground">From a single vehicle to thousands — FleetTrack scales with you.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {solutions.map((s, i) => (
              <div key={i} className="flex gap-4 p-6 bg-card rounded-xl border border-border/60 hover:border-primary/30 transition-colors">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                  <s.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{s.title}</h3>
                  <p className="text-sm text-muted-foreground">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Pricing ─── */}
      <section id="pricing" className="w-full py-24 bg-background">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple, transparent pricing</h2>
            <p className="text-lg text-muted-foreground">No hidden fees. Cancel any time.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {pricingPlans.map((plan, i) => (
              <div
                key={i}
                className={`relative flex flex-col rounded-2xl p-8 border-2 transition-all ${plan.highlight
                  ? "border-primary bg-primary/5 shadow-lg shadow-primary/10 scale-105"
                  : "border-border bg-card"
                  }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-full">
                    MOST POPULAR
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                  <div className="flex items-end gap-1 mb-3">
                    <span className="text-4xl font-extrabold">{plan.price}</span>
                    <span className="text-muted-foreground mb-1">{plan.period}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{plan.desc}</p>
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feat, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                      {feat}
                    </li>
                  ))}
                </ul>
                <Link href={plan.name === "Enterprise" ? "/contact" : "/register"}>
                  <Button className="w-full" variant={plan.highlight ? "default" : "outline"}>
                    {plan.cta}
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Final CTA ─── */}
      <section className="w-full py-32 bg-primary text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "28px 28px" }}
        />
        <div className="relative z-10 max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-5xl font-extrabold mb-6">Start Managing Your Fleet Smarter.</h2>
          <p className="text-xl opacity-90 mb-10 max-w-xl mx-auto leading-relaxed">
            Join thousands of companies using FleetTrack to monitor, manage, and optimise their fleets.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <Button size="lg" variant="secondary" className="h-12 px-8 text-base font-semibold">
                Get Started <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/contact">
              <Button size="lg" variant="outline" className="h-12 px-8 text-base font-semibold border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground hover:text-primary">
                Contact Sales
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
