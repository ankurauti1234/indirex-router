"use client"

import * as React from "react"
import {
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  RefreshCw,
  X,
  SlidersHorizontal,
  Copy,
  Check,
  Server,
  Laptop,
  Columns3,
  Calendar as CalendarIcon,
  Type,
  Clock,
  Link2,
  Braces,
  Radio,
  Tv,
  Wifi,
  Activity,
  Globe,
  HardDrive,
  Users,
  Film,
  Zap,
  Plus,
  Watch,
} from "lucide-react"
import { useTimezoneStore } from "@/lib/use-timezone-store"
import { timezones, mapLabelToIana, formatTimestamp } from "@/lib/timezones"
import { PageContainer } from "@/components/page-container"
import { createClient } from "@/lib/supabase/client"
import { findPlatformIconUrl } from "@/lib/platform-icons"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import type { DateRange } from "react-day-picker"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  ButtonGroup,
  ButtonGroupText,
  ButtonGroupSeparator,
} from "@/components/ui/button-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { renderEventSummary, getNestedProperty, getMatchedRuleBadges } from "@/lib/template-formatter"
import { DEFAULT_ROUTER_EVENT_TYPES, formatRouterDetails } from "@/lib/router-event-defaults"
import { useTelemetryModeStore, TelemetryMode } from "@/lib/use-telemetry-mode-store"

export interface TelemetryEventLog {
  id: string
  device_id: string
  sub_device_id?: string | null
  type: number
  timestamp: string | number
  details: any
  created_at?: string
}

export interface TelemetryEventTypeMeta {
  type: number
  name: string
  description: string
  template?: string
  structure?: any
  sample?: any
  field_rules?: any[]
}

export interface FilterChip {
  id: string
  field: "device_id" | "sub_device_id" | "hostname" | "ip" | "mac" | "platform" | "domain" | "id" | "text"
  value: string
}

const setTimeToDate = (date: Date, timeStr: string): Date => {
  const [hoursStr, minutesStr] = timeStr.split(":")
  const hours = parseInt(hoursStr || "0", 10)
  const minutes = parseInt(minutesStr || "0", 10)
  const newDate = new Date(date)
  newDate.setHours(hours, minutes, 0, 0)
  return newDate
}

const formatTimeToHHMM = (date?: Date): string => {
  if (!date) return "00:00"
  const h = String(date.getHours()).padStart(2, "0")
  const m = String(date.getMinutes()).padStart(2, "0")
  return `${h}:${m}`
}

function parseTimestampToUnix(tsVal: any): number {
  if (typeof tsVal === "number") {
    return tsVal < 1e11 ? tsVal : Math.floor(tsVal / 1000)
  }
  if (!tsVal) return 0
  let str = String(tsVal).trim()
  if (str.includes(" ") && !str.includes("T")) str = str.replace(" ", "T")
  const parsedMs = new Date(str).getTime()
  return isNaN(parsedMs) ? 0 : Math.floor(parsedMs / 1000)
}

interface UniversalEventsClientProps {
  forcedSource?: TelemetryMode
  pageTitle?: string
  pageDescription?: string
}

export function UniversalEventsClient({
  forcedSource,
  pageTitle,
  pageDescription,
}: UniversalEventsClientProps) {
  const { mode: storeMode, setMode: setStoreMode } = useTelemetryModeStore()
  const activeSource = forcedSource || storeMode
  const isRouter = activeSource === "router"
  const isWearable = activeSource === "wearable"

  const { selectedTimezone } = useTimezoneStore()
  const [events, setEvents] = React.useState<TelemetryEventLog[]>([])
  const [isLoadingEvents, setIsLoadingEvents] = React.useState<boolean>(true)
  const [eventTypes, setEventTypes] = React.useState<TelemetryEventTypeMeta[]>([])
  const [distinctDevices, setDistinctDevices] = React.useState<string[]>([])
  const [selectedEvent, setSelectedEvent] = React.useState<TelemetryEventLog | null>(null)

  // Filters State
  const [stagedChips, setStagedChips] = React.useState<FilterChip[]>([])
  const [appliedChips, setAppliedChips] = React.useState<FilterChip[]>([])
  const [stagedSearchField, setStagedSearchField] = React.useState<FilterChip["field"]>("device_id")
  const [stagedSearchTerm, setStagedSearchTerm] = React.useState("")
  const [showSuggestions, setShowSuggestions] = React.useState(false)

  // Dropdown Quick Filters
  const [stagedTypeFilter, setStagedTypeFilter] = React.useState<string>("ALL")
  const [stagedDeviceFilter, setStagedDeviceFilter] = React.useState<string>("ALL")
  const [stagedSubDeviceFilter, setStagedSubDeviceFilter] = React.useState<string>("ALL")
  const [stagedDateRange, setStagedDateRange] = React.useState<DateRange | undefined>(undefined)
  const stagedStartDateFilter = stagedDateRange?.from
  const stagedEndDateFilter = stagedDateRange?.to

  const [appliedTypeFilter, setAppliedTypeFilter] = React.useState<string>("ALL")
  const [appliedDeviceFilter, setAppliedDeviceFilter] = React.useState<string>("ALL")
  const [appliedSubDeviceFilter, setAppliedSubDeviceFilter] = React.useState<string>("ALL")
  const [appliedStartDateFilter, setAppliedStartDateFilter] = React.useState<Date | undefined>(undefined)
  const [appliedEndDateFilter, setAppliedEndDateFilter] = React.useState<Date | undefined>(undefined)

  const [dateFilterPreset, setDateFilterPreset] = React.useState<string>("all")
  const [startTimeStr, setStartTimeStr] = React.useState<string>("00:00")
  const [endTimeStr, setEndTimeStr] = React.useState<string>("23:59")
  const [isCalendarOpen, setIsCalendarOpen] = React.useState(false)

  // View & Pagination
  const [itemsPerPage, setItemsPerPage] = React.useState<number>(50)
  const [currentPage, setCurrentPage] = React.useState<number>(1)
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const [autoRefreshInterval, setAutoRefreshInterval] = React.useState<number>(0)
  const [copiedText, setCopiedText] = React.useState<string | null>(null)
  const [detailTab, setDetailTab] = React.useState<"overview" | "raw">("overview")

  // Resizable columns
  const [colWidths, setColWidths] = React.useState<Record<string, number>>({
    id: 110,
    timestamp: 170,
    type: 190,
    device_id: 130,
    sub_device_id: 100,
    details: 450,
  })

  const [visibleColumns, setVisibleColumns] = React.useState({
    id: true,
    timestamp: true,
    type: true,
    device_id: true,
    sub_device_id: isRouter,
    details: true,
  })

  // Resize handler
  const handleColumnResize = (e: React.MouseEvent, colKey: string) => {
    e.preventDefault()
    e.stopPropagation()
    const startX = e.clientX
    const startWidth = colWidths[colKey] || 150
    document.body.style.userSelect = "none"
    document.body.style.cursor = "col-resize"

    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX
      const newWidth = Math.max(50, startWidth + delta)
      setColWidths((prev) => ({ ...prev, [colKey]: newWidth }))
    }

    const onMouseUp = () => {
      document.body.style.userSelect = ""
      document.body.style.cursor = ""
      document.removeEventListener("mousemove", onMouseMove)
      document.removeEventListener("mouseup", onMouseUp)
    }

    document.addEventListener("mousemove", onMouseMove)
    document.addEventListener("mouseup", onMouseUp)
  }

  // Load telemetry data from respective API endpoint
  const fetchTelemetryData = React.useCallback(async () => {
    setIsLoadingEvents(true)
    try {
      const params = new URLSearchParams()
      if (appliedTypeFilter !== "ALL") params.set("type", appliedTypeFilter)
      if (appliedDeviceFilter !== "ALL") params.set("device_id", appliedDeviceFilter)
      if (isRouter && appliedSubDeviceFilter !== "ALL") params.set("sub_device_id", appliedSubDeviceFilter)
      if (appliedStartDateFilter) params.set("startDate", appliedStartDateFilter.toISOString())
      if (appliedEndDateFilter) params.set("endDate", appliedEndDateFilter.toISOString())
      params.set("pageSize", "500")

      const endpoint = isWearable
        ? `/api/wearable-events?${params.toString()}`
        : isRouter
        ? `/api/router-events?${params.toString()}`
        : `/api/events?${params.toString()}`
      const res = await fetch(endpoint, { cache: "no-store" })

      if (res.ok) {
        const json = await res.json()
        if (json.distinctDevices && Array.isArray(json.distinctDevices)) {
          setDistinctDevices(json.distinctDevices)
        }
        if (json.eventTypes && Array.isArray(json.eventTypes)) {
          setEventTypes(json.eventTypes)
        }
        if (json.events && Array.isArray(json.events)) {
          const formatted: TelemetryEventLog[] = json.events.map((d: any) => {
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
              device_id: String(d.device_id || ""),
              sub_device_id: d.sub_device_id ? String(d.sub_device_id) : null,
              type: typeof d.type === "number" ? d.type : parseInt(d.type || "0", 10),
              timestamp: d.timestamp,
              details: detailsObj,
              created_at: d.created_at,
            }
          })
          setEvents(formatted)
          return
        }
      }
    } catch (err) {
      console.warn("Failed fetching events from API route:", err)
    } finally {
      setIsLoadingEvents(false)
    }
  }, [isRouter, isWearable, appliedTypeFilter, appliedDeviceFilter, appliedSubDeviceFilter, appliedStartDateFilter, appliedEndDateFilter])

  React.useEffect(() => {
    fetchTelemetryData()
  }, [fetchTelemetryData])

  // Periodic background auto-refresh
  React.useEffect(() => {
    if (autoRefreshInterval <= 0) return
    const timer = setInterval(() => {
      fetchTelemetryData()
    }, autoRefreshInterval * 1000)
    return () => clearInterval(timer)
  }, [autoRefreshInterval, fetchTelemetryData])

  // Reset filters and page when active telemetry mode toggles
  React.useEffect(() => {
    setStagedChips([])
    setAppliedChips([])
    setStagedTypeFilter("ALL")
    setAppliedTypeFilter("ALL")
    setStagedDeviceFilter("ALL")
    setAppliedDeviceFilter("ALL")
    setStagedSubDeviceFilter("ALL")
    setAppliedSubDeviceFilter("ALL")
    setStagedSearchTerm("")
    setCurrentPage(1)
  }, [activeSource])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetchTelemetryData()
    setTimeout(() => setIsRefreshing(false), 500)
  }

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedText(text)
    setTimeout(() => setCopiedText(null), 2000)
  }

  // Filter application
  const handleApplyFilters = () => {
    setAppliedChips([...stagedChips])
    setAppliedTypeFilter(stagedTypeFilter)
    setAppliedDeviceFilter(stagedDeviceFilter)
    setAppliedSubDeviceFilter(stagedSubDeviceFilter)

    let finalStart = stagedDateRange?.from
    let finalEnd = stagedDateRange?.to
    if (finalStart && startTimeStr) finalStart = setTimeToDate(finalStart, startTimeStr)
    if (finalEnd && endTimeStr) finalEnd = setTimeToDate(finalEnd, endTimeStr)

    setAppliedStartDateFilter(finalStart)
    setAppliedEndDateFilter(finalEnd)
    setCurrentPage(1)
  }

  const handleResetFilters = () => {
    setStagedChips([])
    setAppliedChips([])
    setStagedTypeFilter("ALL")
    setAppliedTypeFilter("ALL")
    setStagedDeviceFilter("ALL")
    setAppliedDeviceFilter("ALL")
    setStagedSubDeviceFilter("ALL")
    setAppliedSubDeviceFilter("ALL")
    setStagedDateRange(undefined)
    setAppliedStartDateFilter(undefined)
    setAppliedEndDateFilter(undefined)
    setDateFilterPreset("all")
    setStartTimeStr("00:00")
    setEndTimeStr("23:59")
    setCurrentPage(1)
  }

  // Filter chips helpers
  const handleAddChip = (field: FilterChip["field"], value: string) => {
    if (!value.trim()) return
    const newChip: FilterChip = {
      id: `chip-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      field,
      value: value.trim(),
    }
    setStagedChips((prev) => [...prev, newChip])
    setStagedSearchTerm("")
    setShowSuggestions(false)
  }

  const handleRemoveChip = (id: string) => {
    setStagedChips((prev) => prev.filter((c) => c.id !== id))
  }

  // Dynamic autocomplete suggestions for search field
  const suggestions = React.useMemo(() => {
    const term = stagedSearchTerm.toLowerCase().trim()
    let list: string[] = []

    if (stagedSearchField === "device_id") {
      list = distinctDevices
    } else if (stagedSearchField === "sub_device_id") {
      const subs = events.map((e) => e.sub_device_id).filter((v): v is string => Boolean(v))
      list = Array.from(new Set(subs)).sort()
    } else if (stagedSearchField === "hostname") {
      const hosts = events
        .map((e) => getNestedProperty(e.details, "device_details.hostname") || getNestedProperty(e.details, "device_context.hostname"))
        .filter((v): v is string => Boolean(v))
      list = Array.from(new Set(hosts)).sort()
    } else if (stagedSearchField === "ip") {
      const ips = events
        .map((e) => getNestedProperty(e.details, "device_details.ip") || getNestedProperty(e.details, "ip"))
        .filter((v): v is string => Boolean(v))
      list = Array.from(new Set(ips)).sort()
    } else if (stagedSearchField === "mac") {
      const macs = events
        .map((e) => getNestedProperty(e.details, "device_details.mac") || getNestedProperty(e.details, "mac"))
        .filter((v): v is string => Boolean(v))
      list = Array.from(new Set(macs)).sort()
    } else if (stagedSearchField === "platform") {
      const plats = events
        .map((e) => {
          const domPlatform = getNestedProperty(e.details, "domain_activity.platform")
          return typeof domPlatform === "object"
            ? domPlatform.platform
            : (
                domPlatform ||
                getNestedProperty(e.details, "content.platform") ||
                getNestedProperty(e.details, "session.platform") ||
                getNestedProperty(e.details, "session.platform_canonical") ||
                getNestedProperty(e.details, "session_summary.platform")
              )
        })
        .filter((v): v is string => Boolean(v))
      list = Array.from(new Set(plats)).sort()
    } else if (stagedSearchField === "id") {
      list = events.map((e) => e.id).slice(0, 15)
    }

    const existingValues = new Set(stagedChips.filter((c) => c.field === stagedSearchField).map((c) => c.value.toLowerCase()))
    const filtered = list.filter((item) => !existingValues.has(item.toLowerCase()))

    if (!term) return filtered.slice(0, 8)
    return filtered.filter((item) => item.toLowerCase().includes(term)).slice(0, 8)
  }, [stagedSearchField, stagedSearchTerm, distinctDevices, events, stagedChips])

  // In-memory search filtering over loaded records
  const filteredEvents = React.useMemo(() => {
    let list = [...events]

    if (appliedChips.length > 0) {
      list = list.filter((evt) => {
        return appliedChips.every((chip) => {
          const val = chip.value.toLowerCase()
          if (chip.field === "device_id") return evt.device_id.toLowerCase().includes(val)
          if (chip.field === "sub_device_id" && evt.sub_device_id) return evt.sub_device_id.toLowerCase().includes(val)
          if (chip.field === "id") return evt.id.toLowerCase().includes(val)
          if (chip.field === "text") {
            const rawStr = JSON.stringify(evt).toLowerCase()
            return rawStr.includes(val)
          }
          const nestedVal = String(getNestedProperty(evt.details, chip.field) || "").toLowerCase()
          return nestedVal.includes(val)
        })
      })
    }

    return list
  }, [events, appliedChips])

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / itemsPerPage))
  const paginatedEvents = React.useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredEvents.slice(start, start + itemsPerPage)
  }, [filteredEvents, currentPage, itemsPerPage])

  const getEventTypeName = (typeId: number) => {
    const matched = eventTypes.find((t) => t.type === typeId)
    return matched ? matched.name : `TYPE_${typeId}`
  }

  // Formatter for table summary cell
  const renderSummaryCell = (evt: TelemetryEventLog) => {
    const matchedType = eventTypes.find((t) => t.type === evt.type)
    const summary = renderEventSummary(evt.details, matchedType?.template, matchedType?.field_rules, evt.type)
    const matchedBadges = getMatchedRuleBadges(evt.details, matchedType?.field_rules)

    // Resolve platform logo
    const domPlatform = getNestedProperty(evt.details, "domain_activity.platform")
    const platformName = typeof domPlatform === "object"
      ? domPlatform.platform
      : (
          domPlatform ||
          getNestedProperty(evt.details, "content.platform") ||
          getNestedProperty(evt.details, "session.platform") ||
          getNestedProperty(evt.details, "session.platform_canonical") ||
          getNestedProperty(evt.details, "session_summary.platform") ||
          null
        )
    const iconUrl = platformName ? findPlatformIconUrl(String(platformName)) : null

    let displaySummary = summary

    // If platform icon is rendered, strip leading bracketed platform matching the platform name so it isn't duplicated
    if (iconUrl && platformName && displaySummary.startsWith("[")) {
      const platRegex = new RegExp(`^\\[${String(platformName).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]\\s*`, "i")
      displaySummary = displaySummary.replace(platRegex, "")
    }

    // Deduplicate any badge text that might also appear in displaySummary
    matchedBadges.forEach((b) => {
      if (b.display_text) {
        displaySummary = displaySummary
          .replace(new RegExp(`^\\[${b.display_text}\\]\\s*`, "i"), "")
          .replace(new RegExp(`\\bReason:\\s*${b.display_text}\\b\\s*•?`, "i"), "")
          .replace(new RegExp(`\\bReason:\\s*${b.value}\\b\\s*•?`, "i"), "")
          .replace(/\s*•\s*(?=•|$)/g, "")
          .replace(/^\s*•\s*/, "")
          .trim()
      }
    })

    return (
      <div className="flex items-center gap-1.5 truncate">
        {iconUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={iconUrl}
            alt={String(platformName)}
            className="size-4 rounded shrink-0 object-contain border border-border/60 bg-muted/20"
          />
        )}
        {matchedBadges.map((badge) => (
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
        <span className="truncate text-foreground/90 font-mono text-[11px]">{displaySummary || "-"}</span>
      </div>
    )
  }

  const title = pageTitle || "Events Explorer"
  const desc = pageDescription || (
    isWearable
      ? "Real-time acoustic watermarking, song match verifications, and device Wi-Fi connectivity heartbeats."
      : isRouter
      ? "Inspect live hardware network packets, client connections, and OTT bandwidth telemetry."
      : "Real-time client playback events, OTT streams, and telemetry state transitions."
  )

  return (
    <PageContainer
      title={title}
      description={
        <span className="flex items-center gap-2 flex-wrap">
          <span>{desc}</span>
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
      <div className="flex flex-col gap-3 min-w-0">
        
        {/* ====================================================================
            FILTER BAR (Clean Unified Toolbar)
           ==================================================================== */}
        <div className="flex flex-col gap-2 p-2.5 bg-card border border-border rounded-lg shadow-2xs text-xs">
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Grouped Field Picker + Search Bar */}
            <div className="flex items-center flex-1 min-w-[260px] sm:min-w-[320px] rounded-md border border-border bg-background focus-within:ring-1 focus-within:ring-primary focus-within:border-primary transition-all shadow-2xs">
              <Select
                value={stagedSearchField}
                onValueChange={(val: any) => setStagedSearchField(val)}
              >
                <SelectTrigger className="h-8 text-xs w-[125px] shrink-0 border-0 border-r border-border rounded-r-none bg-muted/30 font-medium focus:ring-0 shadow-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="device_id">{isRouter ? "Router ID" : "Device ID"}</SelectItem>
                  {isRouter && <SelectItem value="sub_device_id">Sub-Device ID</SelectItem>}
                  <SelectItem value="hostname">Hostname</SelectItem>
                  <SelectItem value="ip">IP Address</SelectItem>
                  <SelectItem value="mac">MAC Address</SelectItem>
                  <SelectItem value="platform">Platform</SelectItem>
                  <SelectItem value="id">Event ID</SelectItem>
                  <SelectItem value="text">Any Field</SelectItem>
                </SelectContent>
              </Select>

              <div className="relative flex-1 flex items-center">
                <Search className="absolute left-2.5 size-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  value={stagedSearchTerm}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  onChange={(e) => {
                    setStagedSearchTerm(e.target.value)
                    setShowSuggestions(true)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && stagedSearchTerm.trim()) {
                      handleAddChip(stagedSearchField, stagedSearchTerm)
                      setShowSuggestions(false)
                    }
                  }}
                  placeholder={`Search ${stagedSearchField.replace("_", " ")}... (Enter to filter)`}
                  className="h-8 pl-8 pr-8 text-xs border-0 rounded-l-none focus-visible:ring-0 shadow-none bg-transparent"
                />
                {stagedSearchTerm && (
                  <button
                    type="button"
                    onClick={() => {
                      setStagedSearchTerm("")
                      setShowSuggestions(false)
                    }}
                    className="absolute right-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <X className="size-3.5" />
                  </button>
                )}

                {/* Autocomplete Suggestions Popover */}
                {showSuggestions && suggestions.length > 0 && (
                  <div
                    className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg z-50 py-1 font-mono text-xs max-h-48 overflow-y-auto"
                    onMouseDown={(e) => e.preventDefault()}
                  >
                    <div className="px-2.5 py-1 text-[10px] uppercase font-semibold text-muted-foreground/70 border-b border-border/50">
                      Suggested {stagedSearchField.replace("_", " ")}s
                    </div>
                    {suggestions.map((sug) => (
                      <div
                        key={sug}
                        onClick={() => {
                          handleAddChip(stagedSearchField, sug)
                          setShowSuggestions(false)
                        }}
                        className="px-2.5 py-1.5 hover:bg-accent hover:text-accent-foreground cursor-pointer flex items-center justify-between text-xs"
                      >
                        <span className="font-mono truncate">{sug}</span>
                        <span className="text-[10px] text-muted-foreground ml-2 shrink-0">+ Add filter</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Event Type Filter */}
            <Select value={stagedTypeFilter} onValueChange={(val) => setStagedTypeFilter(val ?? "ALL")}>
              <SelectTrigger className="h-8 text-xs w-[150px] bg-background font-medium shrink-0 border border-border shadow-2xs">
                <SelectValue placeholder="All Event Types" />
              </SelectTrigger>
              <SelectContent className="text-xs">
                <SelectItem value="ALL">All Event Types</SelectItem>
                {eventTypes.map((t) => (
                  <SelectItem key={t.type} value={String(t.type)}>
                    {t.type}: {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Device Filter */}
            <Select value={stagedDeviceFilter} onValueChange={(val) => setStagedDeviceFilter(val ?? "ALL")}>
              <SelectTrigger className="h-8 text-xs w-[135px] bg-background font-medium shrink-0 border border-border shadow-2xs">
                <SelectValue placeholder="All Devices" />
              </SelectTrigger>
              <SelectContent className="text-xs">
                <SelectItem value="ALL">All Devices</SelectItem>
                {distinctDevices.map((dev) => (
                  <SelectItem key={dev} value={dev}>
                    {dev}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Sub-Device Filter (Router mode only) */}
            {isRouter && (
              <Select value={stagedSubDeviceFilter} onValueChange={(val) => setStagedSubDeviceFilter(val ?? "ALL")}>
                <SelectTrigger className="h-8 text-xs w-[125px] bg-background font-medium shrink-0 border border-border shadow-2xs">
                  <SelectValue placeholder="All Sub-Devices" />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="ALL">All Sub-Devices</SelectItem>
                  <SelectItem value="NULL">Unassigned</SelectItem>
                </SelectContent>
              </Select>
            )}

            {/* Date Range Popover */}
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger render={<Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 bg-background font-normal shrink-0 border border-border shadow-2xs" />}>
                <CalendarIcon className="size-3.5 text-muted-foreground shrink-0" />
                <span className="truncate max-w-[130px]">
                  {stagedDateRange?.from ? (
                    stagedDateRange.to ? (
                      `${format(stagedDateRange.from, "LLL dd")} - ${format(stagedDateRange.to, "LLL dd")}`
                    ) : (
                      format(stagedDateRange.from, "LLL dd, yyyy")
                    )
                  ) : (
                    "Select Date Range"
                  )}
                </span>
                <ChevronDown className="size-3 text-muted-foreground shrink-0 ml-0.5" />
              </PopoverTrigger>
              <PopoverContent className="w-auto p-3 text-xs" align="end">
                <div className="space-y-3">
                  <div className="flex items-center gap-1 border-b border-border pb-2">
                    {["Today", "Yesterday", "Last 7 Days", "All"].map((preset) => (
                      <Button
                        key={preset}
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs px-2"
                        onClick={() => {
                          const now = new Date()
                          if (preset === "Today") {
                            const d = new Date(now.getFullYear(), now.getMonth(), now.getDate())
                            setStagedDateRange({ from: d, to: d })
                          } else if (preset === "Yesterday") {
                            const y = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
                            setStagedDateRange({ from: y, to: y })
                          } else if (preset === "Last 7 Days") {
                            const s = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7)
                            setStagedDateRange({ from: s, to: now })
                          } else {
                            setStagedDateRange(undefined)
                          }
                          setIsCalendarOpen(false)
                        }}
                      >
                        {preset}
                      </Button>
                    ))}
                  </div>
                  <Calendar
                    mode="range"
                    selected={stagedDateRange}
                    onSelect={setStagedDateRange}
                    numberOfMonths={2}
                  />
                </div>
              </PopoverContent>
            </Popover>

            {/* Grouped Auto-Refresh Select + Refresh Button */}
            <div className="flex items-center rounded-md border border-border bg-background shadow-2xs overflow-hidden shrink-0">
              <Select value={String(autoRefreshInterval)} onValueChange={(val) => setAutoRefreshInterval(Number(val ?? 0))}>
                <SelectTrigger className="h-8 text-xs px-2.5 border-0 border-r border-border rounded-r-none bg-transparent hover:bg-muted/30 font-medium focus:ring-0 shadow-none">
                  <span className="text-muted-foreground mr-1 text-[11px]">Auto:</span>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="0">Off</SelectItem>
                  <SelectItem value="5">5s</SelectItem>
                  <SelectItem value="10">10s</SelectItem>
                  <SelectItem value="30">30s</SelectItem>
                  <SelectItem value="60">60s</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2.5 rounded-l-none hover:bg-muted/40 border-0 cursor-pointer"
                onClick={handleRefresh}
                title="Refresh Live Data"
              >
                <RefreshCw className={cn("size-3.5", isRefreshing && "animate-spin")} />
              </Button>
            </div>

            {/* Columns Visibility Popover */}
            <Popover>
              <PopoverTrigger className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md border border-border bg-background hover:bg-muted/30 text-xs font-medium cursor-pointer shadow-2xs">
                <Columns3 className="size-3.5 text-muted-foreground" />
                <span>Columns</span>
                <ChevronDown className="size-3 text-muted-foreground/60" />
              </PopoverTrigger>
              <PopoverContent align="end" className="w-52 p-2 text-xs space-y-1">
                <div className="font-semibold px-2 py-1 text-[11px] text-muted-foreground border-b border-border/60 uppercase tracking-wider">
                  Toggle Columns
                </div>
                <label className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={visibleColumns.id}
                    onChange={(e) => setVisibleColumns((prev) => ({ ...prev, id: e.target.checked }))}
                    className="size-3.5 rounded border-border"
                  />
                  <span>Event ID</span>
                </label>
                <label className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={visibleColumns.timestamp}
                    onChange={(e) => setVisibleColumns((prev) => ({ ...prev, timestamp: e.target.checked }))}
                    className="size-3.5 rounded border-border"
                  />
                  <span>Timestamp</span>
                </label>
                <label className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={visibleColumns.type}
                    onChange={(e) => setVisibleColumns((prev) => ({ ...prev, type: e.target.checked }))}
                    className="size-3.5 rounded border-border"
                  />
                  <span>Event Type</span>
                </label>
                <label className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={visibleColumns.device_id}
                    onChange={(e) => setVisibleColumns((prev) => ({ ...prev, device_id: e.target.checked }))}
                    className="size-3.5 rounded border-border"
                  />
                  <span>{isRouter ? "Router ID" : "Device ID"}</span>
                </label>
                {isRouter && (
                  <label className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={visibleColumns.sub_device_id}
                      onChange={(e) => setVisibleColumns((prev) => ({ ...prev, sub_device_id: e.target.checked }))}
                      className="size-3.5 rounded border-border"
                    />
                    <span>Sub-Device ID</span>
                  </label>
                )}
                <label className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={visibleColumns.details}
                    onChange={(e) => setVisibleColumns((prev) => ({ ...prev, details: e.target.checked }))}
                    className="size-3.5 rounded border-border"
                  />
                  <span>Summary & Details</span>
                </label>
              </PopoverContent>
            </Popover>

            {/* Action Buttons */}
            <div className="flex items-center gap-1.5 ml-auto shrink-0">
              <Button size="sm" className="h-8 text-xs font-semibold px-3" onClick={handleApplyFilters}>
                Apply
              </Button>
              <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground px-2" onClick={handleResetFilters}>
                Reset
              </Button>
            </div>
          </div>

          {/* Staged Filter Chips List */}
          {stagedChips.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-border/50">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mr-1">
                Active Filter Chips:
              </span>
              {stagedChips.map((chip) => (
                <span
                  key={chip.id}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-primary/10 text-primary border border-primary/20 font-medium"
                >
                  <span className="text-muted-foreground uppercase text-[9px] font-bold">{chip.field}:</span>
                  <span>{chip.value}</span>
                  <button type="button" onClick={() => handleRemoveChip(chip.id)} className="hover:text-destructive">
                    <X className="size-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* ====================================================================
            DATA TABLE VIEW (Resizable Columns + Selection Drawer)
           ==================================================================== */}
        <div className="border border-border bg-card rounded-lg overflow-hidden shadow-2xs flex flex-col">
          <div className="overflow-x-auto min-w-full">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-[11px] font-bold text-muted-foreground uppercase select-none">
                  {visibleColumns.id && (
                    <th style={{ width: colWidths.id }} className="relative py-2.5 px-3">
                      <span>Event ID</span>
                      <div onMouseDown={(e) => handleColumnResize(e, "id")} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50" />
                    </th>
                  )}
                  {visibleColumns.timestamp && (
                    <th style={{ width: colWidths.timestamp }} className="relative py-2.5 px-3">
                      <span>Timestamp ({selectedTimezone.slice(0, 10)})</span>
                      <div onMouseDown={(e) => handleColumnResize(e, "timestamp")} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50" />
                    </th>
                  )}
                  {visibleColumns.type && (
                    <th style={{ width: colWidths.type }} className="relative py-2.5 px-3">
                      <span>Event Type</span>
                      <div onMouseDown={(e) => handleColumnResize(e, "type")} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50" />
                    </th>
                  )}
                  {visibleColumns.device_id && (
                    <th style={{ width: colWidths.device_id }} className="relative py-2.5 px-3">
                      <span>Device ID</span>
                      <div onMouseDown={(e) => handleColumnResize(e, "device_id")} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50" />
                    </th>
                  )}
                  {isRouter && visibleColumns.sub_device_id && (
                    <th style={{ width: colWidths.sub_device_id }} className="relative py-2.5 px-3">
                      <span>Slot/Sub-Dev</span>
                      <div onMouseDown={(e) => handleColumnResize(e, "sub_device_id")} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50" />
                    </th>
                  )}
                  {visibleColumns.details && (
                    <th style={{ width: colWidths.details }} className="relative py-2.5 px-3">
                      <span>Event Summary & Details</span>
                      <div onMouseDown={(e) => handleColumnResize(e, "details")} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50" />
                    </th>
                  )}
                  <th className="py-2.5 px-3 w-16 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {paginatedEvents.length > 0 ? (
                  paginatedEvents.map((evt) => {
                    const isSelected = selectedEvent?.id === evt.id
                    return (
                      <tr
                        key={evt.id}
                        onClick={() => setSelectedEvent(evt)}
                        className={cn(
                          "hover:bg-muted/30 cursor-pointer transition-colors",
                          isSelected && "bg-primary/5 font-medium"
                        )}
                      >
                        {visibleColumns.id && (
                          <td className="py-2 px-3 font-mono text-[11px] text-muted-foreground truncate">
                            {evt.id}
                          </td>
                        )}
                        {visibleColumns.timestamp && (
                          <td className="py-2 px-3 text-muted-foreground whitespace-nowrap text-[11px]">
                            {formatTimestamp(evt.timestamp, selectedTimezone)}
                          </td>
                        )}
                        {visibleColumns.type && (
                          <td className="py-2 px-3">
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold font-mono bg-muted border border-border">
                              <span className="text-primary">{evt.type}</span>
                              <span className="text-foreground/90">{getEventTypeName(evt.type)}</span>
                            </span>
                          </td>
                        )}
                        {visibleColumns.device_id && (
                          <td className="py-2 px-3 font-mono text-xs text-foreground truncate">
                            {evt.device_id}
                          </td>
                        )}
                        {isRouter && visibleColumns.sub_device_id && (
                          <td className="py-2 px-3 font-mono text-xs text-muted-foreground truncate">
                            {evt.sub_device_id || "-"}
                          </td>
                        )}
                        {visibleColumns.details && (
                          <td className="py-2 px-3 max-w-[450px]">
                            {renderSummaryCell(evt)}
                          </td>
                        )}
                        <td className="py-2 px-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleCopyText(JSON.stringify(evt.details, null, 2))
                            }}
                            title="Copy Raw Details JSON"
                          >
                            <Copy className="size-3" />
                          </Button>
                        </td>
                      </tr>
                    )
                  })
                ) : isLoadingEvents ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-xs text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2.5">
                        <RefreshCw className="size-5 animate-spin text-primary" />
                        <span className="font-medium">Loading {isWearable ? "Wearable" : isRouter ? "Router" : "SDK"} Telemetry Events...</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-xs text-muted-foreground">
                      No telemetry events match your criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* ====================================================================
              PAGINATION FOOTER
             ==================================================================== */}
          <div className="flex items-center justify-between p-3 border-t border-border bg-muted/20 text-xs">
            <div className="text-muted-foreground">
              Showing {(currentPage - 1) * itemsPerPage + 1} -{" "}
              {Math.min(currentPage * itemsPerPage, filteredEvents.length)} of{" "}
              <span className="font-semibold text-foreground">{filteredEvents.length}</span> events
            </div>

            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Rows per page:</span>
              <Select
                value={String(itemsPerPage)}
                onValueChange={(val) => {
                  setItemsPerPage(Number(val))
                  setCurrentPage(1)
                }}
              >
                <SelectTrigger className="h-7 text-xs w-[65px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="200">200</SelectItem>
                  <SelectItem value="500">500</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center gap-1 ml-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 w-7 p-0"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(1)}
                >
                  <ChevronsLeft className="size-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 w-7 p-0"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="size-3.5" />
                </Button>

                <span className="px-2 text-xs font-medium">
                  {currentPage} of {totalPages}
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 w-7 p-0"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                >
                  <ChevronRight className="size-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 w-7 p-0"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(totalPages)}
                >
                  <ChevronsRight className="size-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* ====================================================================
            SIDE DRAWER: EVENT DETAILS INSPECTOR (Shadcn Sheet with Outside Click Close)
           ==================================================================== */}
        <Sheet
          open={Boolean(selectedEvent)}
          onOpenChange={(open) => {
            if (!open) setSelectedEvent(null)
          }}
        >
          <SheetContent
            side="right"
            className="w-full sm:max-w-xl md:max-w-2xl p-0 flex flex-col h-full bg-card border-l border-border shadow-2xl overflow-hidden"
          >
            {selectedEvent && (
              <>
                <SheetHeader className="p-4 border-b border-border bg-muted/20">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Event Telemetry Inspector
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted border border-border">
                      ID: {selectedEvent.id.slice(0, 8)}...
                    </span>
                  </div>
                  <SheetTitle className="text-base font-bold text-foreground font-mono mt-0.5">
                    {getEventTypeName(selectedEvent.type)} ({selectedEvent.type})
                  </SheetTitle>
                  <SheetDescription className="text-xs text-muted-foreground font-mono">
                    Device: {selectedEvent.device_id} {selectedEvent.sub_device_id ? `• Sub: ${selectedEvent.sub_device_id}` : ""} • {formatTimestamp(selectedEvent.timestamp, selectedTimezone)}
                  </SheetDescription>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {/* Quick Meta Stats */}
                  <div className="grid grid-cols-2 gap-2 text-xs bg-muted/30 p-2.5 rounded-lg border border-border">
                    <div>
                      <span className="text-muted-foreground block text-[10px] font-bold uppercase">Device ID</span>
                      <span className="font-mono font-semibold">{selectedEvent.device_id}</span>
                    </div>
                    {selectedEvent.sub_device_id && (
                      <div>
                        <span className="text-muted-foreground block text-[10px] font-bold uppercase">Sub-Device</span>
                        <span className="font-mono font-semibold">{selectedEvent.sub_device_id}</span>
                      </div>
                    )}
                    <div className="col-span-2">
                      <span className="text-muted-foreground block text-[10px] font-bold uppercase">Timestamp</span>
                      <span className="font-mono text-[11px]">
                        {formatTimestamp(selectedEvent.timestamp, selectedTimezone)}
                      </span>
                    </div>
                  </div>

                  {/* Drawer Tabs */}
                  <div className="flex items-center gap-1 border-b border-border pb-1">
                    <Button
                      variant={detailTab === "overview" ? "secondary" : "ghost"}
                      size="sm"
                      className="h-7 text-xs font-semibold"
                      onClick={() => setDetailTab("overview")}
                    >
                      Summary & Badges
                    </Button>
                    <Button
                      variant={detailTab === "raw" ? "secondary" : "ghost"}
                      size="sm"
                      className="h-7 text-xs font-semibold"
                      onClick={() => setDetailTab("raw")}
                    >
                      Raw JSON Payload
                    </Button>
                  </div>

                  {detailTab === "overview" ? (
                    <div className="space-y-3 text-xs">
                      {/* Matched Rules Badges List */}
                      {(() => {
                        const matchedType = eventTypes.find((t) => t.type === selectedEvent.type)
                        const badges = getMatchedRuleBadges(selectedEvent.details, matchedType?.field_rules)
                        if (badges.length === 0) return null
                        return (
                          <div>
                            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block mb-1">
                              Applied Rule Badges ({badges.length})
                            </span>
                            <div className="flex flex-wrap gap-1.5 p-2 bg-muted/30 border border-border rounded-lg">
                              {badges.map((b) => (
                                <span
                                  key={b.id || b.display_text}
                                  className={cn(
                                    "px-2 py-0.5 rounded text-[11px] font-mono font-bold border uppercase tracking-wider",
                                    b.badge_color === "success" && "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
                                    b.badge_color === "info" && "bg-sky-500/15 text-sky-400 border-sky-500/30",
                                    b.badge_color === "warning" && "bg-amber-500/15 text-amber-400 border-amber-500/30",
                                    b.badge_color === "destructive" && "bg-rose-500/15 text-rose-400 border-rose-500/30",
                                    (!b.badge_color || b.badge_color === "default") && "bg-muted text-muted-foreground border-border"
                                  )}
                                >
                                  {b.display_text}
                                </span>
                              ))}
                            </div>
                          </div>
                        )
                      })()}

                      <div>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block mb-1">
                          Evaluated Summary String
                        </span>
                        <div className="p-3 bg-muted/40 border border-border rounded-lg font-mono text-[11px] leading-relaxed break-words">
                          {renderSummaryCell(selectedEvent)}
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block mb-1">
                          Payload Key-Values
                        </span>
                        <div className="divide-y divide-border/60 border border-border rounded-lg bg-card overflow-hidden">
                          {Object.entries(selectedEvent.details || {}).map(([key, val]) => (
                            <div key={key} className="p-2.5 flex items-start justify-between gap-2 text-xs">
                              <span className="font-mono font-bold text-foreground/80">{key}</span>
                              <span className="font-mono text-muted-foreground text-right break-all">
                                {typeof val === "object" ? JSON.stringify(val) : String(val)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="relative">
                      <Button
                        size="sm"
                        variant="outline"
                        className="absolute right-2 top-2 h-6 text-[10px] gap-1 z-10"
                        onClick={() => handleCopyText(JSON.stringify(selectedEvent.details, null, 2))}
                      >
                        {copiedText ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
                        {copiedText ? "Copied" : "Copy JSON"}
                      </Button>
                      <pre className="p-3 bg-muted/60 border border-border rounded-lg font-mono text-[11px] overflow-x-auto whitespace-pre-wrap max-h-[480px]">
                        {JSON.stringify(selectedEvent.details, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </PageContainer>
  )
}
