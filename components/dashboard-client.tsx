"use client"

import * as React from "react"
import {
  Activity,
  TrendingUp,
  Database,
  Wifi,
  Home,
  CheckCircle2,
} from "lucide-react"
import { PageContainer } from "./page-container"

export function DashboardClient() {
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Mock data for dashboard
  const activePanels = [
    { hhid: "HH0002", router: "RM0008", device: "LG Smart TV", status: "Online", platform: "YouTube", activity: "Active 4s ago" },
    { hhid: "HH0005", router: "RM0009", device: "Ankur's iPhone", status: "Online", platform: "Netflix", activity: "Active 10s ago" },
    { hhid: "HH0001", router: "RM0001", device: "MacBook Pro", status: "Offline", platform: "-", activity: "Offline 2h ago" },
    { hhid: "HH0007", router: "RM0014", device: "Samsung TV", status: "Online", platform: "Prime Video", activity: "Active 1m ago" },
  ]

  const platformShare = [
    { name: "YouTube", percentage: 48, color: "bg-rose-500" },
    { name: "Netflix", percentage: 32, color: "bg-red-600" },
    { name: "Prime Video", percentage: 12, color: "bg-sky-500" },
    { name: "Others", percentage: 8, color: "bg-muted-foreground/60" },
  ]

  return (
    <PageContainer
      title="Project Overview"
      description={
        <span className="flex flex-wrap items-center gap-2">
          <span>Real-time diagnostics, bandwidth distribution, and panel connectivity.</span>
          <span className="bg-primary/5 text-primary text-[10.5px] font-medium px-2 py-0.5 rounded border border-primary/10 flex items-center gap-1">
            <CheckCircle2 className="size-3 shrink-0 text-primary" />
            All services operational
          </span>
        </span>
      }
    >
      {/* KPI Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* KPI 1 */}
        <div className="bg-card p-5 rounded-xl border flex flex-col justify-between shadow-2xs">
          <div className="flex justify-between items-start">
            <span className="text-xs text-muted-foreground font-medium">Active Streams</span>
            <Activity className="size-4 text-primary" />
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-bold tracking-tight text-foreground">3</div>
            <p className="text-[10px] text-muted-foreground mt-1">Streaming across active households</p>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-card p-5 rounded-xl border flex flex-col justify-between shadow-2xs">
          <div className="flex justify-between items-start">
            <span className="text-xs text-muted-foreground font-medium">Daily Telemetry Load</span>
            <Database className="size-4 text-muted-foreground/80" />
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-bold tracking-tight text-foreground">1,248,504</div>
            <p className="text-[10px] text-primary font-semibold flex items-center gap-0.5 mt-1">
              <TrendingUp className="size-3" /> +12.4% vs yesterday
            </p>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-card p-5 rounded-xl border flex flex-col justify-between shadow-2xs">
          <div className="flex justify-between items-start">
            <span className="text-xs text-muted-foreground font-medium">Total Network Bandwidth</span>
            <Wifi className="size-4 text-muted-foreground/80" />
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-bold tracking-tight text-foreground">14.8 Mbps</div>
            <p className="text-[10px] text-muted-foreground mt-1">Real-time throughput speed</p>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-card p-5 rounded-xl border flex flex-col justify-between shadow-2xs">
          <div className="flex justify-between items-start">
            <span className="text-xs text-muted-foreground font-medium">Panel Coverage</span>
            <Home className="size-4 text-muted-foreground/80" />
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-bold tracking-tight text-foreground">94.8%</div>
            <p className="text-[10px] text-muted-foreground mt-1">Connected household meters</p>
          </div>
        </div>
      </div>

      {/* Supabase Charts Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Chart 1: Telemetry Volume */}
        <div className="bg-card border rounded-xl p-5 shadow-2xs flex flex-col justify-between h-80">
          <div>
            <div className="flex justify-between items-center mb-1">
              <h3 className="text-xs font-bold text-foreground">Incoming Telemetry Rate</h3>
              <span className="text-[10px] text-muted-foreground font-mono bg-muted px-2 py-0.5 rounded-md">
                Events / sec
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">Real-time parsing volume over the past 2 hours</p>
          </div>

          {/* SVG Custom Area Chart with Gradients */}
          <div className="relative w-full h-44 border-b border-l border-border mt-4">
            <svg className="w-full h-full" viewBox="0 0 500 150" preserveAspectRatio="none">
              <defs>
                <linearGradient id="chartGreenGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
                </linearGradient>
              </defs>
              {/* Grid Lines */}
              <line x1="0" y1="37.5" x2="500" y2="37.5" stroke="var(--border)" strokeWidth="0.5" strokeDasharray="3" />
              <line x1="0" y1="75" x2="500" y2="75" stroke="var(--border)" strokeWidth="0.5" strokeDasharray="3" />
              <line x1="0" y1="112.5" x2="500" y2="112.5" stroke="var(--border)" strokeWidth="0.5" strokeDasharray="3" />

              {/* Area path */}
              <path d="M 0 130 Q 50 110 100 125 T 200 65 T 300 80 T 400 45 T 500 30 L 500 150 L 0 150 Z" fill="url(#chartGreenGrad)" />
              {/* Line path */}
              <path d="M 0 130 Q 50 110 100 125 T 200 65 T 300 80 T 400 45 T 500 30" fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <div className="absolute left-2.5 top-1.5 text-[8px] font-mono text-muted-foreground select-none">150 ev/s</div>
            <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[8px] font-mono text-muted-foreground select-none">75 ev/s</div>
            <div className="absolute left-2.5 bottom-1 text-[8px] font-mono text-muted-foreground select-none">0 ev/s</div>
          </div>
          <div className="flex justify-between text-[9px] text-muted-foreground font-mono mt-1 select-none">
            <span>2h ago</span>
            <span>1h ago</span>
            <span>30m ago</span>
            <span>Just now</span>
          </div>
        </div>

        {/* Chart 2: WAN Data Usage */}
        <div className="bg-card border rounded-xl p-5 shadow-2xs flex flex-col justify-between h-80">
          <div>
            <div className="flex justify-between items-center mb-1">
              <h3 className="text-xs font-bold text-foreground">WAN Transmission Speed</h3>
              <span className="text-[10px] text-muted-foreground font-mono bg-muted px-2 py-0.5 rounded-md">
                Mbps
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">WAN packet forwarding speeds for audience analysis</p>
          </div>

          {/* SVG Custom Area Chart with Blue Gradient */}
          <div className="relative w-full h-44 border-b border-l border-border mt-4">
            <svg className="w-full h-full" viewBox="0 0 500 150" preserveAspectRatio="none">
              <defs>
                <linearGradient id="chartBlueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgb(59, 130, 246)" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="rgb(59, 130, 246)" stopOpacity="0" />
                </linearGradient>
              </defs>
              {/* Grid Lines */}
              <line x1="0" y1="37.5" x2="500" y2="37.5" stroke="var(--border)" strokeWidth="0.5" strokeDasharray="3" />
              <line x1="0" y1="75" x2="500" y2="75" stroke="var(--border)" strokeWidth="0.5" strokeDasharray="3" />
              <line x1="0" y1="112.5" x2="500" y2="112.5" stroke="var(--border)" strokeWidth="0.5" strokeDasharray="3" />

              {/* Area path */}
              <path d="M 0 140 Q 60 135 120 120 T 240 135 T 360 80 T 480 60 T 500 55 L 500 150 L 0 150 Z" fill="url(#chartBlueGrad)" />
              {/* Line path */}
              <path d="M 0 140 Q 60 135 120 120 T 240 135 T 360 80 T 480 60 T 500 55" fill="none" stroke="rgb(59, 130, 246)" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <div className="absolute left-2.5 top-1.5 text-[8px] font-mono text-muted-foreground select-none">30 Mbps</div>
            <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[8px] font-mono text-muted-foreground select-none">15 Mbps</div>
            <div className="absolute left-2.5 bottom-1 text-[8px] font-mono text-muted-foreground select-none">0 Mbps</div>
          </div>
          <div className="flex justify-between text-[9px] text-muted-foreground font-mono mt-1 select-none">
            <span>2h ago</span>
            <span>1h ago</span>
            <span>30m ago</span>
            <span>Just now</span>
          </div>
        </div>
      </div>

      {/* Bottom allocation details */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column: Bandwidth Allocation */}
        <div className="bg-card border rounded-xl p-5 shadow-2xs md:col-span-2 flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="text-xs font-bold text-foreground">Bandwidth Allocation</h3>
            <p className="text-[11px] text-muted-foreground mt-1">Forwarding share breakdown by media streaming service</p>
          </div>

          <div className="space-y-4 my-2">
            {platformShare.map((share) => (
              <div key={share.name} className="space-y-1.5">
                <div className="flex justify-between text-[11px] font-medium text-foreground">
                  <span>{share.name}</span>
                  <span>{share.percentage}%</span>
                </div>
                <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
                  <div className={`${share.color} h-full rounded-full`} style={{ width: `${share.percentage}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Active Household Panels */}
        <div className="bg-card border rounded-xl p-5 shadow-2xs flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="text-xs font-bold text-foreground">Active Household Panels</h3>
            <p className="text-[11px] text-muted-foreground mt-1">Meters forward status updates</p>
          </div>

          <div className="divide-y divide-border text-xs">
            {activePanels.map((panel) => (
              <div key={panel.hhid} className="py-2.5 flex items-center justify-between first:pt-0 last:pb-0">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${
                    panel.status === "Online" ? "bg-primary" : "bg-muted-foreground/30"
                  }`} />
                  <div className="flex flex-col text-left">
                    <span className="font-semibold text-foreground">{panel.hhid}</span>
                    <span className="text-[9px] text-muted-foreground font-mono">{panel.device}</span>
                  </div>
                </div>
                <span className="text-[9px] font-mono text-muted-foreground">{panel.activity}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageContainer>
  )
}
