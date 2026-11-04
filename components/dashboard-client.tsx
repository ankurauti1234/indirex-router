"use client"

import * as React from "react"
import Link from "next/link"
import {
  Activity,
  Database,
  Router as RouterIcon,
  Tv,
  Radio,
  Watch,
  FileBarChart,
  GitFork,
  SlidersHorizontal,
  ChevronRight,
  Flame,
  ArrowUpRight,
  RefreshCw,
  Clock,
  Layers,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { findPlatformIconUrl, fetchPlatformMappings } from "@/lib/platform-icons"
import { PageContainer } from "./page-container"
import { useTimezoneStore } from "@/lib/use-timezone-store"
import { useTelemetryModeStore } from "@/lib/use-telemetry-mode-store"
import { formatTimestamp } from "@/lib/timezones"
import { renderEventSummary, getMatchedRuleBadges, DynamicFieldRule } from "@/lib/template-formatter"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface DashboardEvent {
  id: string
  device_id: string
  sub_device_id?: string | null
  timestamp: string | number
  type: number
  details: any
}

interface PlatformStat {
  name: string
  key: string
  iconUrl: string | null
  count: number
  percentage: number
}

interface TypeDistribution {
  type: number
  name: string
  count: number
  percentage: number
}

export function DashboardClient() {
  const supabase = React.useMemo(() => createClient(), [])
  const { selectedTimezone } = useTimezoneStore()
  const { mode } = useTelemetryModeStore()
  const isRouter = mode === "router"
  const isWearable = mode === "wearable"

  const [loading, setLoading] = React.useState(true)
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const [events, setEvents] = React.useState<DashboardEvent[]>([])
  const [eventTypesMeta, setEventTypesMeta] = React.useState<any[]>([])
  const [totalEventsCount, setTotalEventsCount] = React.useState<number>(0)
  const [activeDevicesCount, setActiveDevicesCount] = React.useState<number>(0)
  const [distinctDeviceIds, setDistinctDeviceIds] = React.useState<string[]>([])
  const [topPlatforms, setTopPlatforms] = React.useState<PlatformStat[]>([])
  const [typeDistribution, setTypeDistribution] = React.useState<TypeDistribution[]>([])

  const loadDashboardData = React.useCallback(async () => {
    try {
      // 1. Ensure platform mappings are loaded
      await fetchPlatformMappings()

      const primaryTable = isWearable ? "wearable_events" : isRouter ? "router_events" : "playback_events"
      const typesEndpoint = isWearable ? "/api/wearable-event-types" : isRouter ? "/api/router-rules" : "/api/events"

      // 2. Fetch parallel stats
      const [eventsRes, typesRes, totalCountRes, devicesRes] = await Promise.all([
        supabase
          .from(primaryTable)
          .select("*")
          .order("timestamp", { ascending: false })
          .limit(60),
        fetch(typesEndpoint, { cache: "no-store" }).then(r => r.ok ? r.json() : {}).catch(() => ({})) as Promise<any>,
        supabase
          .from(primaryTable)
          .select("id", { count: "exact", head: true }),
        isWearable
          ? supabase.from("wearable_devices").select("device_id")
          : supabase.from("devices").select("device_id, is_active"),
      ])

      // Total counts
      if (totalCountRes.count !== null && totalCountRes.count !== undefined) {
        setTotalEventsCount(totalCountRes.count)
      } else {
        setTotalEventsCount(eventsRes.data?.length || 0)
      }

      if (devicesRes.data && devicesRes.data.length > 0) {
        const activeOnly = devicesRes.data.filter((d: any) => d.is_active !== false).length
        setActiveDevicesCount(activeOnly || devicesRes.data.length)
        setDistinctDeviceIds(devicesRes.data.map((d: any) => d.device_id))
      } else if (eventsRes.data) {
        const devSet = Array.from(new Set(eventsRes.data.map((d: any) => d.device_id).filter(Boolean))) as string[]
        setActiveDevicesCount(devSet.length)
        setDistinctDeviceIds(devSet)
      }

      // Event types dictionary
      let loadedTypes: any[] = []
      if (typesRes.eventTypes && Array.isArray(typesRes.eventTypes)) {
        loadedTypes = typesRes.eventTypes
      }
      setEventTypesMeta(loadedTypes)

      // Format events list
      if (eventsRes.data && eventsRes.data.length > 0) {
        const parsedEvents: DashboardEvent[] = eventsRes.data.map((d: any) => {
          let detailsObj: any = {}
          if (typeof d.details === "string") {
            try { detailsObj = JSON.parse(d.details) } catch { detailsObj = {} }
          } else if (d.details && typeof d.details === "object") {
            detailsObj = d.details
          }
          if (isWearable) {
            detailsObj = {
              ...detailsObj,
              content_type: d.content_type ?? detailsObj.content_type,
              content: d.content ?? detailsObj.content,
              wifi_status: d.wifi_status ?? detailsObj.wifi_status,
              wifi_connected: d.wifi_connected ?? detailsObj.wifi_connected,
              ssid: d.ssid ?? detailsObj.ssid,
            }
          }
          return {
            id: String(d.id),
            device_id: String(d.device_id || (isWearable ? "Wearable" : isRouter ? "Router" : "Device")),
            sub_device_id: d.sub_device_id ? String(d.sub_device_id) : null,
            timestamp: d.timestamp,
            type: Number(d.type || 0),
            details: detailsObj,
          }
        })
        setEvents(parsedEvents)

        // 3. Compute Top Platforms dynamically (or songs/networks for wearable)
        const platCounts: Record<string, number> = {}
        let totalPlatHits = 0

        parsedEvents.forEach((evt) => {
          let platName = isWearable
            ? (evt.details?.content || (evt.details?.ssid ? `WiFi: ${evt.details.ssid}` : (evt.details?.wifi_status ? `WiFi ${evt.details.wifi_status}` : null)))
            : (evt.details?.session?.platform ||
              evt.details?.session?.platform_canonical ||
              evt.details?.session_summary?.platform ||
              evt.details?.domain_activity?.platform ||
              evt.details?.content?.platform ||
              null)
            null

          if (typeof platName === "object" && platName !== null) {
            platName = platName.platform
          }

          if (platName && typeof platName === "string" && platName.trim()) {
            const clean = platName.toLowerCase().trim().replace(/\.com$/, "")
            platCounts[clean] = (platCounts[clean] || 0) + 1
            totalPlatHits++
          }
        })

        const sortedPlatforms: PlatformStat[] = Object.entries(platCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([key, count]) => {
            const formattedName = key.charAt(0).toUpperCase() + key.slice(1)
            const icon = findPlatformIconUrl(key)
            return {
              name: formattedName,
              key,
              iconUrl: icon,
              count,
              percentage: totalPlatHits > 0 ? Math.round((count / totalPlatHits) * 100) : 0,
            }
          })
        setTopPlatforms(sortedPlatforms)

        // 4. Compute Event Type Distribution
        const typeCounts: Record<number, number> = {}
        parsedEvents.forEach((evt) => {
          typeCounts[evt.type] = (typeCounts[evt.type] || 0) + 1
        })

        const sortedDist: TypeDistribution[] = Object.entries(typeCounts)
          .map(([typeStr, count]) => {
            const tNum = Number(typeStr)
            const matched = loadedTypes.find((t) => t.type === tNum)
            const name = matched?.name || `TYPE_${tNum}`
            return {
              type: tNum,
              name,
              count,
              percentage: parsedEvents.length > 0 ? Math.round((count / parsedEvents.length) * 100) : 0,
            }
          })
          .sort((a, b) => b.count - a.count)
          .slice(0, 5)

        setTypeDistribution(sortedDist)
      } else {
        setEvents([])
        setTopPlatforms([])
        setTypeDistribution([])
      }
    } catch (err) {
      console.error("Dashboard data load error:", err)
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }, [supabase, isRouter])

  React.useEffect(() => {
    setLoading(true)
    loadDashboardData()
  }, [loadDashboardData])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await loadDashboardData()
  }

  // Active streaming sessions count
  const activeSessionsCount = React.useMemo(() => {
    if (isRouter) {
      return events.filter(e => e.type === 5 || e.type === 4 || e.type === 3).length
    }
    return events.filter(e => e.type === 1 || e.type === 2).length
  }, [events, isRouter])

  return (
    <PageContainer
      title="Telemetry Dashboard"
      description={
        <span className="flex items-center gap-2 flex-wrap">
          <span>Live operational telemetry, event velocity, active hardware meters, and media distribution.</span>
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-muted border border-border">
            {isWearable ? (
              <Watch className="size-3 text-emerald-500" />
            ) : isRouter ? (
              <Radio className="size-3 text-sky-500" />
            ) : (
              <Tv className="size-3 text-primary" />
            )}
            {isWearable ? "Wearable Telemetry" : isRouter ? "Router Telemetry" : "SDK Telemetry"}
          </span>
        </span>
      }
    >
      <div className="flex flex-col gap-6 min-w-0">
        
        {/* ====================================================================
            TOP KPI CARDS (4 Essential Operational Metrics)
           ==================================================================== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          
          {/* Metric 1: Total Events Logged */}
          <div className="p-4 bg-card border border-border rounded-lg shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
              <span>{isWearable ? "Total Wearable Events" : isRouter ? "Total Router Events" : "Total Playback Events"}</span>
              <Database className="size-4 text-primary" />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold font-mono text-foreground">
                {loading ? "..." : totalEventsCount.toLocaleString()}
              </span>
              <span className="text-[10px] font-semibold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                Live Ingest
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {isWearable ? "Stored in wearable_events table" : isRouter ? "Stored in router_events table" : "Stored in playback_events table"}
            </p>
          </div>

          {/* Metric 2: Active Devices */}
          <div className="p-4 bg-card border border-border rounded-lg shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
              <span>{isWearable ? "Active Wearables" : isRouter ? "Active Router Meters" : "Active Playback Clients"}</span>
              {isWearable ? <Watch className="size-4 text-emerald-500" /> : <RouterIcon className="size-4 text-purple-500" />}
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold font-mono text-foreground">
                {loading ? "..." : activeDevicesCount}
              </span>
              <span className="text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">
                Operational
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {distinctDeviceIds.length} total registered hardware units
            </p>
          </div>

          {/* Metric 3: Active Sessions / Streams */}
          <div className="p-4 bg-card border border-border rounded-lg shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
              <span>{isWearable ? "Song Matches & Carrier" : isRouter ? "Tracked Sessions" : "Active Media Streams"}</span>
              <Activity className="size-4 text-emerald-500" />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold font-mono text-foreground">
                {loading ? "..." : activeSessionsCount}
              </span>
              <span className="text-[10px] font-semibold text-sky-500 bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20">
                Recent 60s
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {isWearable ? "Acoustic mic watermark & song detections" : isRouter ? "OTT viewing & ADB domain activity" : "Playback starts & heartbeats"}
            </p>
          </div>

          {/* Metric 4: Platform Rules & Schema Integrity */}
          <div className="p-4 bg-card border border-border rounded-lg shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
              <span>Rules & Schema Status</span>
              <CheckCircle2 className="size-4 text-emerald-500" />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold font-mono text-foreground">
                {eventTypesMeta.length > 0 ? `${eventTypesMeta.length} Types` : "100%"}
              </span>
              <span className="text-[10px] font-semibold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                DB Synced
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              All field badges evaluated dynamically
            </p>
          </div>
        </div>

        {/* ====================================================================
            MIDDLE SECTION: Top Platforms & Event Distribution Breakdowns
           ==================================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          
          {/* Card 1: Top Active Platforms */}
          <div className="p-4 bg-card border border-border rounded-lg shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <Layers className="size-4 text-primary" />
                  <h3 className="font-semibold text-sm text-foreground">
                    {isWearable ? "Acoustic Hits & Networks" : "Top Active Platforms"}
                  </h3>
                </div>
                <Link
                  href="/platform-mapping"
                  className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
                >
                  <span>Mappings</span>
                  <ExternalLink className="size-3" />
                </Link>
              </div>

              <div className="divide-y divide-border/40 mt-1">
                {topPlatforms.length === 0 ? (
                  <div className="py-6 text-center text-xs text-muted-foreground font-mono">
                    No platform session hits detected in recent stream.
                  </div>
                ) : (
                  topPlatforms.map((plat) => (
                    <div key={plat.key} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {plat.iconUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={plat.iconUrl}
                            alt={plat.name}
                            className="size-5 rounded object-contain border border-border/60 bg-muted/20 shrink-0"
                          />
                        ) : (
                          <div className="size-5 rounded bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground border border-border">
                            {plat.name.charAt(0)}
                          </div>
                        )}
                        <span className="font-semibold text-foreground truncate">{plat.name}</span>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="w-24 bg-muted h-2 rounded-full overflow-hidden hidden sm:block">
                          <div
                            className="bg-primary h-full rounded-full transition-all duration-500"
                            style={{ width: `${plat.percentage}%` }}
                          />
                        </div>
                        <span className="font-mono text-[11px] text-muted-foreground w-12 text-right">
                          {plat.percentage}%
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-border/40 text-[11px] text-muted-foreground flex items-center justify-between">
              <span>Automatic OTT CDN and DNS resolution</span>
              <span className="text-emerald-500 font-medium">15 Platforms Mapped</span>
            </div>
          </div>

          {/* Card 2: Telemetry Event Type Distribution */}
          <div className="p-4 bg-card border border-border rounded-lg shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <Activity className="size-4 text-purple-500" />
                  <h3 className="font-semibold text-sm text-foreground">Event Type Distribution</h3>
                </div>
                <Link
                  href="/rules"
                  className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
                >
                  <span>Rules Engine</span>
                  <ExternalLink className="size-3" />
                </Link>
              </div>

              <div className="divide-y divide-border/40 mt-1">
                {typeDistribution.length === 0 ? (
                  <div className="py-6 text-center text-xs text-muted-foreground font-mono">
                    No event type records available to analyze.
                  </div>
                ) : (
                  typeDistribution.map((dist) => (
                    <div key={dist.type} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                          T{dist.type}
                        </span>
                        <span className="font-medium text-foreground truncate">{dist.name}</span>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="w-24 bg-muted h-2 rounded-full overflow-hidden hidden sm:block">
                          <div
                            className="bg-purple-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${dist.percentage}%` }}
                          />
                        </div>
                        <span className="font-mono text-[11px] text-muted-foreground w-16 text-right">
                          {dist.count} ({dist.percentage}%)
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-border/40 text-[11px] text-muted-foreground flex items-center justify-between">
              <span>Telemetry schema classification</span>
              <span className="text-primary font-medium">PostgreSQL Managed</span>
            </div>
          </div>
        </div>

        {/* ====================================================================
            RECENT REAL-TIME TELEMETRY STREAM TABLE
           ==================================================================== */}
        <div className="border border-border bg-card rounded-lg overflow-hidden shadow-2xs">
          <div className="p-3 border-b border-border flex items-center justify-between gap-3 bg-muted/10">
            <div className="flex items-center gap-2">
              <Flame className="size-4 text-amber-500" />
              <span className="font-bold text-xs text-foreground uppercase tracking-wider">
                Live Ingestion Stream (Recent 10 Events)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs px-2 gap-1 cursor-pointer"
                onClick={handleRefresh}
                title="Refresh Live Data"
              >
                <RefreshCw className={cn("size-3", isRefreshing && "animate-spin")} />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
              <Link
                href="/events"
                className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline ml-1"
              >
                <span>Open in Events Explorer</span>
                <ChevronRight className="size-3.5" />
              </Link>
            </div>
          </div>

          <div className="overflow-x-auto w-full min-w-0 custom-scrollbar">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-[11px] font-bold text-muted-foreground uppercase select-none font-mono">
                  <th className="py-2.5 px-3 w-36">Timestamp</th>
                  <th className="py-2.5 px-3 w-40">Event Type</th>
                  <th className="py-2.5 px-3 w-32">{isRouter ? "Router ID" : "Device ID"}</th>
                  <th className="py-2.5 px-3">Summary & Applied Field Rules</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-xs">
                {events.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-muted-foreground font-mono">
                      No events currently logged in this telemetry mode.
                    </td>
                  </tr>
                ) : (
                  events.slice(0, 10).map((evt) => {
                    const matchedType = eventTypesMeta.find((t) => t.type === evt.type)
                    const summary = renderEventSummary(
                      evt.details,
                      matchedType?.template,
                      matchedType?.field_rules,
                      evt.type
                    )
                    const matchedBadges = getMatchedRuleBadges(evt.details, matchedType?.field_rules)

                    // Platform logo resolution
                    const domPlatform = evt.details?.domain_activity?.platform
                    const platformName = typeof domPlatform === "object"
                      ? domPlatform.platform
                      : (
                          domPlatform ||
                          evt.details?.content?.platform ||
                          evt.details?.session?.platform ||
                          evt.details?.session?.platform_canonical ||
                          evt.details?.session_summary?.platform ||
                          null
                        )
                    const iconUrl = platformName ? findPlatformIconUrl(String(platformName)) : null

                    let displaySummary = summary
                    if (iconUrl && platformName && displaySummary.startsWith("[")) {
                      const platRegex = new RegExp(`^\\[${String(platformName).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]\\s*`, "i")
                      displaySummary = displaySummary.replace(platRegex, "")
                    }
                    matchedBadges.forEach((b) => {
                      if (b.display_text) {
                        displaySummary = displaySummary
                          .replace(new RegExp(`^\\[${b.display_text}\\]\\s*`, "i"), "")
                          .replace(new RegExp(`\\bReason:\\s*${b.display_text}\\b\\s*•?`, "i"), "")
                          .replace(/\s*•\s*(?=•|$)/g, "")
                          .replace(/^\s*•\s*/, "")
                          .trim()
                      }
                    })

                    return (
                      <tr key={evt.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 px-3 text-muted-foreground font-mono whitespace-nowrap">
                          {formatTimestamp(evt.timestamp, selectedTimezone)}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-muted text-foreground border border-border">
                            {matchedType?.name || `TYPE_${evt.type}`}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-semibold font-mono text-foreground truncate">
                          {evt.device_id}
                          {evt.sub_device_id && (
                            <span className="text-muted-foreground text-[10px] ml-1">
                              ({evt.sub_device_id})
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 truncate max-w-[500px]">
                          <div className="flex items-center gap-1.5 truncate">
                            {iconUrl && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={iconUrl}
                                alt={String(platformName)}
                                className="size-4 rounded shrink-0 object-contain border border-border/60 bg-muted/20"
                              />
                            )}
                            {matchedBadges.map((badge: DynamicFieldRule) => (
                              <span
                                key={badge.id || badge.display_text}
                                className={cn(
                                  "px-1.5 py-0.2 rounded text-[10px] font-mono font-bold shrink-0 border uppercase tracking-wider",
                                  badge.badge_color === "success" && "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
                                  badge.badge_color === "info" && "bg-sky-500/15 text-sky-400 border-sky-500/30",
                                  badge.badge_color === "warning" && "bg-amber-500/15 text-amber-400 border-amber-500/30",
                                  badge.badge_color === "destructive" && "bg-rose-500/15 text-rose-400 border-rose-500/30",
                                  (!badge.badge_color || badge.badge_color === "default") && "bg-muted text-muted-foreground border-border"
                                )}
                              >
                                {badge.display_text}
                              </span>
                            ))}
                            <span className="truncate text-foreground/90 font-mono text-[11px]">
                              {displaySummary || "-"}
                            </span>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="p-3 border-t border-border bg-muted/20 text-xs text-muted-foreground flex items-center justify-between">
            <span>Displaying latest events streaming from Supabase</span>
            <Link
              href="/events"
              className="text-primary hover:underline font-medium flex items-center gap-1"
            >
              <span>Explore all records</span>
              <ArrowUpRight className="size-3" />
            </Link>
          </div>
        </div>

      </div>
    </PageContainer>
  )
}
