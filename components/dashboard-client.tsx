"use client"

import * as React from "react"
import Link from "next/link"
import {
  Activity,
  Database,
  Router as RouterIcon,
  Tv,
  Smartphone,
  Play,
  Pause,
  CheckCircle2,
  TrendingUp,
  Clock,
  ArrowUpRight,
  Filter,
  Layers,
  Wifi,
  Zap,
  Radio,
  FileBarChart,
  GitFork,
  SlidersHorizontal,
  Terminal,
  ChevronRight,
  Flame,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { PageContainer } from "./page-container"
import { useTimezoneStore } from "@/lib/use-timezone-store"
import { formatTimestamp } from "@/lib/timezones"

interface PlaybackEvent {
  id: string
  device_id: string
  timestamp: string | number
  type: number
  details: any
}

// Fallback sample data matching our exact database schema
const FALLBACK_EVENTS: PlaybackEvent[] = [
  {
    id: "evt_101",
    device_id: "RMB007",
    timestamp: Date.now() - 1000 * 45,
    type: 1,
    details: {
      household_context: { hhid: "HH0002", router_id: "RM0008" },
      device_context: { device_type: "Smart TV", os: "Android TV", hostname: "LivingRoom-TV" },
      content: { platform: "OTT", title: "Jurassic World Rebirth", content_type: "Movie" },
      playback: { bitrate: "1080p", playhead_position: 120, volume_level: 80 },
    },
  },
  {
    id: "evt_102",
    device_id: "RM0007",
    timestamp: Date.now() - 1000 * 90,
    type: 2,
    details: {
      household_context: { hhid: "HH0005", router_id: "RM0009" },
      device_context: { device_type: "Mobile", os: "iOS", hostname: "Ankur-iPhone" },
      content: { platform: "Spotify", title: "Spotify Stream", content_type: "Audio" },
      playback: { bitrate: "320kbps", playhead_position: 240, volume_level: 65 },
    },
  },
  {
    id: "evt_103",
    device_id: "RMB007",
    timestamp: Date.now() - 1000 * 180,
    type: 2,
    details: {
      household_context: { hhid: "HH0002", router_id: "RM0008" },
      device_context: { device_type: "Smart TV", os: "Android TV", hostname: "LivingRoom-TV" },
      content: { platform: "OTT", title: "Jurassic World Rebirth", content_type: "Movie" },
      playback: { bitrate: "1080p", playhead_position: 7317, volume_level: 80 },
    },
  },
  {
    id: "evt_104",
    device_id: "RM0007",
    timestamp: Date.now() - 1000 * 300,
    type: 3,
    details: {
      household_context: { hhid: "HH0005", router_id: "RM0009" },
      device_context: { device_type: "Mobile", os: "iOS", hostname: "Ankur-iPhone" },
      content: { platform: "OTT", title: "Jurassic World Rebirth", content_type: "Movie" },
      playback: { bitrate: "1080p", playhead_position: 912, volume_level: 75 },
      reason: "APP_BACKGROUND",
    },
  },
  {
    id: "evt_105",
    device_id: "RMB007",
    timestamp: Date.now() - 1000 * 420,
    type: 18,
    details: {
      household_context: { hhid: "HH0001", router_id: "RM0001" },
      device_context: { device_type: "Smart TV", os: "webOS", hostname: "LG-OLED-TV" },
      payload: { human_count: 3, ambient_temp: "24.5C", sensor_status: "ACTIVE" },
    },
  },
  {
    id: "evt_106",
    device_id: "RM0008",
    timestamp: Date.now() - 1000 * 600,
    type: 1,
    details: {
      household_context: { hhid: "HH0003", router_id: "RM0008" },
      device_context: { device_type: "Smart TV", os: "Tizen", hostname: "Samsung-4K" },
      content: { platform: "Netflix", title: "Stranger Things S4", content_type: "TV Series" },
      playback: { bitrate: "4K UHD", playhead_position: 45, volume_level: 90 },
    },
  },
]

export function DashboardClient() {
  const supabase = createClient()
  const { selectedTimezone } = useTimezoneStore()
  const [events, setEvents] = React.useState<PlaybackEvent[]>(FALLBACK_EVENTS)
  const [activeTab, setActiveTab] = React.useState<"ALL" | "PLAY" | "HEARTBEAT" | "DECLARATION">("ALL")
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    async function loadData() {
      try {
        const { data, error } = await supabase
          .from("playback_events")
          .select("*")
          .order("timestamp", { ascending: false })
          .limit(40)

        if (!error && data && data.length > 0) {
          const parsed = data.map((d: any) => {
            let detailsObj = {}
            if (typeof d.details === "string") {
              try { detailsObj = JSON.parse(d.details) } catch { detailsObj = {} }
            } else if (d.details && typeof d.details === "object") {
              detailsObj = d.details
            }
            return {
              id: String(d.id),
              device_id: String(d.device_id || "RM0001"),
              timestamp: d.timestamp,
              type: Number(d.type),
              details: detailsObj,
            }
          })
          setEvents(parsed)
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [supabase])

  const getTypeName = (type: number): string => {
    switch (type) {
      case 1: return "PLAY_START"
      case 2: return "PLAY_HEARTBEAT"
      case 3: return "PLAY_PAUSE"
      case 4: return "PLAY_RESUME"
      case 5: return "PLAY_END"
      case 18: return "NETWORK_DECLARATION"
      default: return `EVENT_TYPE_${type}`
    }
  }

  const getTypeBadgeClass = (type: number): string => {
    switch (type) {
      case 1: return "bg-[#1C2B42] text-[#579DFF] border-[#579DFF]/30"
      case 2: return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
      case 3: return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
      case 4: return "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20"
      case 5: return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
      case 18: return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
      default: return "bg-muted text-muted-foreground border-border"
    }
  }

  // Filter events based on active tab & limit to latest 5
  const filteredEvents = React.useMemo(() => {
    let list = events
    if (activeTab === "PLAY") list = events.filter(e => e.type === 1 || e.type === 4)
    else if (activeTab === "HEARTBEAT") list = events.filter(e => e.type === 2)
    else if (activeTab === "DECLARATION") list = events.filter(e => e.type === 18)
    return list.slice(0, 5)
  }, [events, activeTab])

  // Aggregate stats
  const activeStreamsCount = events.filter(e => e.type === 1 || e.type === 2).length
  const uniqueDevices = Array.from(new Set(events.map(e => e.device_id))).length

  return (
    <PageContainer
      title="Overview & Highlights"
      description="Centralized telemetry monitor, router event stream & live system diagnostics."
    >
      <div className="space-y-8">
        
        {/* ====================================================================
            SECTION 1: Confluence "Pick up where you left off" Quick Access Grid
           ==================================================================== */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold text-foreground uppercase tracking-wider">
            Pick up where you left off
          </h2>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {/* Card 1: Events Explorer */}
            <Link
              href="/events"
              className="group bg-card hover:bg-muted/40 border border-border rounded-lg p-4 transition-all flex flex-col justify-between h-32 hover:border-[#579DFF]/40 shadow-2xs"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="size-8 rounded-md bg-[#1C2B42] text-[#579DFF] flex items-center justify-center shrink-0">
                    <Database className="size-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-foreground group-hover:text-[#579DFF] transition-colors">
                      Events Explorer
                    </h3>
                    <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                      Live Telemetry Stream
                    </p>
                  </div>
                </div>
                <ArrowUpRight className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:text-[#579DFF] transition-all" />
              </div>

              <div className="text-[10px] text-muted-foreground font-mono pt-2 border-t border-border/40 flex items-center justify-between">
                <span>{events.length} packets logged</span>
                <span className="text-[#579DFF]">Live feed</span>
              </div>
            </Link>

            {/* Card 2: System Rules */}
            <Link
              href="/rules"
              className="group bg-card hover:bg-muted/40 border border-border rounded-lg p-4 transition-all flex flex-col justify-between h-32 hover:border-[#579DFF]/40 shadow-2xs"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="size-8 rounded-md bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/20">
                    <SlidersHorizontal className="size-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-foreground group-hover:text-[#579DFF] transition-colors">
                      Rules Engine
                    </h3>
                    <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                      Routing Logic & Triggers
                    </p>
                  </div>
                </div>
                <ArrowUpRight className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:text-[#579DFF] transition-all" />
              </div>

              <div className="text-[10px] text-muted-foreground font-mono pt-2 border-t border-border/40 flex items-center justify-between">
                <span>12 active rules</span>
                <span className="text-emerald-400">All passing</span>
              </div>
            </Link>

            {/* Card 3: Event Mapping */}
            <Link
              href="/event-mapping"
              className="group bg-card hover:bg-muted/40 border border-border rounded-lg p-4 transition-all flex flex-col justify-between h-32 hover:border-[#579DFF]/40 shadow-2xs sm:col-span-2 lg:col-span-1"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="size-8 rounded-md bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
                    <GitFork className="size-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-foreground group-hover:text-[#579DFF] transition-colors">
                      Event Mapping
                    </h3>
                    <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                      Payload Schema Mapping
                    </p>
                  </div>
                </div>
                <ArrowUpRight className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:text-[#579DFF] transition-all" />
              </div>

              <div className="text-[10px] text-muted-foreground font-mono pt-2 border-t border-border/40 flex items-center justify-between">
                <span>Types 1..18 configured</span>
                <span className="text-sky-400">100% mapped</span>
              </div>
            </Link>
          </div>
        </div>

        {/* ====================================================================
            SECTION 2: Main Grid (Feed Stream + Sidebar Widgets)
           ==================================================================== */}
        <div className="grid gap-6 lg:grid-cols-3">
          
          {/* Left Column: Live Feed Stream (2 Cols wide) */}
          <div className="lg:col-span-2 space-y-4">
            
            {/* Feed Section Title & Pill Tabs (Confluence Style) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border">
              <div className="flex items-center gap-2">
                <Flame className="size-4 text-[#579DFF]" />
                <h2 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Discover what's happening
                </h2>
              </div>

              {/* Confluence Pill Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setActiveTab("ALL")}
                  className={`px-3 py-1 text-xs rounded-full font-medium transition-all cursor-pointer ${
                    activeTab === "ALL"
                      ? "bg-[#1C2B42] text-[#579DFF] font-semibold border border-[#579DFF]/30"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent"
                  }`}
                >
                  All ({events.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("PLAY")}
                  className={`px-3 py-1 text-xs rounded-full font-medium transition-all cursor-pointer ${
                    activeTab === "PLAY"
                      ? "bg-[#1C2B42] text-[#579DFF] font-semibold border border-[#579DFF]/30"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent"
                  }`}
                >
                  Playback (1)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("HEARTBEAT")}
                  className={`px-3 py-1 text-xs rounded-full font-medium transition-all cursor-pointer ${
                    activeTab === "HEARTBEAT"
                      ? "bg-[#1C2B42] text-[#579DFF] font-semibold border border-[#579DFF]/30"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent"
                  }`}
                >
                  Heartbeats (2)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("DECLARATION")}
                  className={`px-3 py-1 text-xs rounded-full font-medium transition-all cursor-pointer ${
                    activeTab === "DECLARATION"
                      ? "bg-[#1C2B42] text-[#579DFF] font-semibold border border-[#579DFF]/30"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent"
                  }`}
                >
                  Declarations (18)
                </button>
              </div>
            </div>

            {/* Live Feed Card List */}
            <div className="space-y-3">
              {filteredEvents.map((evt) => {
                const devType = evt.details?.device_context?.device_type || "Smart TV"
                const contentTitle = evt.details?.content?.title || evt.details?.payload?.sensor_status || "Jurassic World Rebirth"
                const platform = evt.details?.content?.platform || "OTT"
                const hhid = evt.details?.household_context?.hhid || "HH0002"
                const bitrate = evt.details?.playback?.bitrate || "1080p"
                const playhead = evt.details?.playback?.playhead_position || 0

                return (
                  <div
                    key={evt.id}
                    className="bg-card border border-border rounded-lg p-4 hover:border-border/80 transition-all space-y-2.5 shadow-2xs"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {/* Device Avatar Circle */}
                        <div className="size-9 rounded-full bg-muted border border-border flex items-center justify-center shrink-0 text-foreground font-semibold">
                          {devType.toLowerCase().includes("mobile") ? (
                            <Smartphone className="size-4 text-[#579DFF]" />
                          ) : (
                            <Tv className="size-4 text-emerald-400" />
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-xs text-foreground">
                              {evt.device_id}
                            </span>
                            <span className="text-[11px] text-muted-foreground">•</span>
                            <span className="text-xs text-foreground font-medium">
                              {devType}
                            </span>
                            <span className="text-[11px] text-muted-foreground">—</span>
                            <span className="text-xs font-semibold text-[#579DFF] truncate max-w-[220px]">
                              {contentTitle}
                            </span>
                          </div>

                          <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">
                            Household: <span className="text-foreground">{hhid}</span> • Platform: <span className="text-foreground">{platform}</span> • Bitrate: <span className="text-foreground">{bitrate}</span>
                          </p>
                        </div>
                      </div>

                      {/* Event Type Badge */}
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border shrink-0 ${getTypeBadgeClass(evt.type)}`}>
                        {getTypeName(evt.type)}
                      </span>
                    </div>

                    {/* Footer Details */}
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono pt-2 border-t border-border/40">
                      <div className="flex items-center gap-3">
                        {playhead > 0 && <span>Playhead: {playhead}s</span>}
                        {evt.details?.reason && <span>Reason: {evt.details.reason}</span>}
                        {evt.details?.payload?.human_count && (
                          <span className="text-emerald-400 font-semibold">
                            Human Count: {evt.details.payload.human_count} | Temp: {evt.details.payload.ambient_temp}
                          </span>
                        )}
                      </div>
                      <span className="flex items-center gap-1">
                        <Clock className="size-3 text-muted-foreground" />
                        {formatTimestamp(evt.timestamp, selectedTimezone)}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Right Column: Widgets */}
          <div className="space-y-6">
            
            {/* Widget 1: System Telemetry Stats */}
            <div className="bg-card border border-border rounded-lg p-4 space-y-4 shadow-2xs">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                System Diagnostics
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-muted/40 rounded-md border border-border/50">
                  <span className="text-[10px] text-muted-foreground font-medium block">Active Streams</span>
                  <span className="text-lg font-bold text-foreground font-mono mt-0.5 block">{activeStreamsCount}</span>
                </div>
                <div className="p-3 bg-muted/40 rounded-md border border-border/50">
                  <span className="text-[10px] text-muted-foreground font-medium block">Active Routers</span>
                  <span className="text-lg font-bold text-foreground font-mono mt-0.5 block">{uniqueDevices}</span>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-border/40">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">WAN Ingestion Speed</span>
                  <span className="font-mono font-semibold text-foreground">14.8 Mbps</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Parse Error Rate</span>
                  <span className="font-mono font-semibold text-emerald-400">0.00%</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Active Meters</span>
                  <span className="font-mono font-semibold text-[#579DFF]">100% Operational</span>
                </div>
              </div>
            </div>

            {/* Widget 2: Popular Content Streamed */}
            <div className="bg-card border border-border rounded-lg p-4 space-y-3 shadow-2xs">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                Top Streamed Media
              </h3>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between p-2 rounded bg-muted/30 border border-border/30">
                  <div className="flex items-center gap-2 min-w-0">
                    <Tv className="size-3.5 text-[#579DFF] shrink-0" />
                    <span className="font-medium text-foreground truncate">Jurassic World Rebirth</span>
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground">OTT</span>
                </div>

                <div className="flex items-center justify-between p-2 rounded bg-muted/30 border border-border/30">
                  <div className="flex items-center gap-2 min-w-0">
                    <Smartphone className="size-3.5 text-emerald-400 shrink-0" />
                    <span className="font-medium text-foreground truncate">Spotify Stream</span>
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground">Audio</span>
                </div>

                <div className="flex items-center justify-between p-2 rounded bg-muted/30 border border-border/30">
                  <div className="flex items-center gap-2 min-w-0">
                    <Tv className="size-3.5 text-purple-400 shrink-0" />
                    <span className="font-medium text-foreground truncate">Stranger Things S4</span>
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground">Netflix</span>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>
    </PageContainer>
  )
}
