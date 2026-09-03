"use client"

import * as React from "react"
import Link from "next/link"
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
} from "lucide-react"
import { useTimezoneStore } from "@/lib/use-timezone-store"
import { timezones, mapLabelToIana, formatTimestamp } from "@/lib/timezones"
import { PageContainer } from "./page-container"
import { createClient } from "@/lib/supabase/client"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
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

interface HouseholdContext {
  hhid: string
  router_id: string
  network_ssid_hash: string
  set_top_box_id: string
}

interface DeviceContext {
  device_id: string
  device_type: string
  hostname: string
  os: string
  app_version: string
  ip_address: string
}

interface UserContext {
  member_id: string
  logged_in_id: string
  session_guest_id: string
}

interface ContentDetails {
  platform: string
  content_id: string | null
  title: string
  genre?: string
  duration_seconds?: number
  content_type?: string
  is_live?: boolean
  season_episode?: string
  creator?: string
  audio_language?: string
}

interface PlaybackDetails {
  playhead_position: number
  bitrate: string
  playback_speed: number
  subtitle_status: string
  volume_level: number
  bytes_downloaded?: number
  packet_loss_percentage?: number
  buffer_duration_seconds?: number
}

interface EventLog {
  id: string
  device_id: string
  timestamp: number
  type: number // References event_types.id
  details: {
    household_context?: HouseholdContext
    device_context?: DeviceContext
    user_context?: UserContext
    content?: ContentDetails
    playback?: PlaybackDetails
    previous_content?: {
      platform: string
      content_id: string | null
      title: string
      playhead_position: number
    }
    new_content?: {
      platform: string
      content_id: string | null
      title: string
      playhead_position: number
    }
    reason?: string
    playhead_position?: number
    volume_level?: number
    pause_duration_seconds?: number
    watch_duration_seconds?: number
    completion_percentage?: number
  }
}

interface EventType {
  id: number
  name: string
  description: string
  is_active?: boolean
  structure?: any
  sample?: any
  template?: string
  field_rules?: any[]
}

export function EventsClient() {
  const { selectedTimezone } = useTimezoneStore()
  const [events, setEvents] = React.useState<EventLog[]>([])
  const [eventTypes, setEventTypes] = React.useState<EventType[]>([])
  const [selectedEvent, setSelectedEvent] = React.useState<EventLog | null>(null)
  
  // Search & Filter Settings (Staging)
  const [stagedSearchTerm, setStagedSearchTerm] = React.useState("")
  const [stagedSearchField, setStagedSearchField] = React.useState<"device_id" | "id" | "hostname" | "device" | "device_type">("device_id")
  const [stagedTypeFilter, setStagedTypeFilter] = React.useState<string>("ALL")
  const [stagedStartDateFilter, setStagedStartDateFilter] = React.useState<Date | undefined>(undefined)
  const [stagedEndDateFilter, setStagedEndDateFilter] = React.useState<Date | undefined>(undefined)

  // Active/Applied Filter Settings
  const [appliedSearchTerm, setAppliedSearchTerm] = React.useState("")
  const [appliedSearchField, setAppliedSearchField] = React.useState<"device_id" | "id" | "hostname" | "device" | "device_type">("device_id")
  const [appliedTypeFilter, setAppliedTypeFilter] = React.useState<string>("ALL")
  const [appliedStartDateFilter, setAppliedStartDateFilter] = React.useState<Date | undefined>(undefined)
  const [appliedEndDateFilter, setAppliedEndDateFilter] = React.useState<Date | undefined>(undefined)

  // Auto Refresh Interval selector state (default: 60 sec i.e. 60000 ms)
  const [refreshInterval, setRefreshInterval] = React.useState<number>(60000)

  // Pagination settings
  const [currentPage, setCurrentPage] = React.useState(1)
  const [itemsPerPage, setItemsPerPage] = React.useState(25)

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1)
  }, [appliedSearchTerm, appliedTypeFilter, appliedStartDateFilter, appliedEndDateFilter])

  // Column visibility states
  const [visibleColumns, setVisibleColumns] = React.useState({
    device_id: true,
    hostname: false,
    device: false,
    device_type: true,
    timestamp: true,
    type: true,
    details: true,
  })
  const [showColumnDropdown, setShowColumnDropdown] = React.useState(false)

  // Refresh & Poll states
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const [activeDetailTab, setActiveDetailTab] = React.useState<"overview" | "logs" | "raw">("overview")
  const [copiedText, setCopiedText] = React.useState<string | null>(null)

  const hasChanges = 
    stagedSearchTerm !== appliedSearchTerm ||
    stagedSearchField !== appliedSearchField ||
    stagedTypeFilter !== appliedTypeFilter ||
    stagedStartDateFilter?.getTime() !== appliedStartDateFilter?.getTime() ||
    stagedEndDateFilter?.getTime() !== appliedEndDateFilter?.getTime()

  const isFilterApplied = 
    appliedSearchTerm !== "" ||
    appliedTypeFilter !== "ALL" ||
    appliedStartDateFilter !== undefined ||
    appliedEndDateFilter !== undefined

  const handleApplyFilters = () => {
    setAppliedSearchTerm(stagedSearchTerm)
    setAppliedSearchField(stagedSearchField)
    setAppliedTypeFilter(stagedTypeFilter)
    setAppliedStartDateFilter(stagedStartDateFilter)
    setAppliedEndDateFilter(stagedEndDateFilter)
  }

  const handleClearFilters = () => {
    setStagedSearchTerm("")
    setStagedSearchField("device_id")
    setStagedTypeFilter("ALL")
    setStagedStartDateFilter(undefined)
    setStagedEndDateFilter(undefined)

    setAppliedSearchTerm("")
    setAppliedSearchField("device_id")
    setAppliedTypeFilter("ALL")
    setAppliedStartDateFilter(undefined)
    setAppliedEndDateFilter(undefined)
  }

  const supabase = createClient()

  // Fetch Event Types and Events from Supabase
  const fetchSupabaseData = React.useCallback(async () => {
    try {
      // 1. Fetch Event Types and Rules
      const [typesRes, rulesRes] = await Promise.all([
        supabase.from("event_types").select("*"),
        supabase.from("event_details_rules").select("*")
      ])

      const typesData = typesRes.data
      const rulesData = rulesRes.data || []
      
      if (!typesRes.error && typesData) {
        const formatted: EventType[] = typesData.map((d: any) => {
          const rule = rulesData.find((r: any) => r.type_id === d.type)
          
          const descText = d.description || "No description set"
          const templateText = rule?.template || undefined
          const fieldRules = Array.isArray(rule?.field_rules)
            ? rule.field_rules
            : (Array.isArray(rule?.structure?._field_rules) ? rule.structure._field_rules : [])

          return {
            id: d.type,
            name: d.name || `TYPE_${d.type}`,
            description: descText,
            is_active: true,
            structure: rule?.structure || null,
            sample: rule?.sample || null,
            template: templateText,
            field_rules: fieldRules,
          }
        })
        setEventTypes(formatted)
      }

      // 2. Fetch Telemetry Events
      let query = supabase.from("playback_events").select("*")
      
      if (appliedTypeFilter !== "ALL") {
        query = query.eq("type", parseInt(appliedTypeFilter))
      }
      if (appliedStartDateFilter) {
        query = query.gte("timestamp", appliedStartDateFilter.toISOString())
      }
      if (appliedEndDateFilter) {
        query = query.lte("timestamp", appliedEndDateFilter.toISOString())
      }

      const { data: eventsData, error: eventsError } = await query.order("timestamp", { ascending: false })

      if (!eventsError && eventsData) {
        const formatted: EventLog[] = eventsData.map((d: any) => ({
          id: d.id,
          device_id: d.device_id,
          timestamp: Math.floor(new Date(d.timestamp).getTime() / 1000),
          type: d.type,
          details: d.details || {},
        }))
        setEvents(formatted)
      } else {
        setEvents([])
      }
    } catch (e) {
      setEvents([])
    }
  }, [appliedTypeFilter, appliedStartDateFilter, appliedEndDateFilter])

  // Trigger manual refresh
  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetchSupabaseData()
    // Simulated spinning delay for premium interaction feel
    setTimeout(() => setIsRefreshing(false), 600)
  }

  // Initial and Automatic polling responsive to refreshInterval
  React.useEffect(() => {
    fetchSupabaseData()
    if (refreshInterval === 0) return
    const interval = setInterval(fetchSupabaseData, refreshInterval)
    return () => clearInterval(interval)
  }, [fetchSupabaseData, refreshInterval])

  // Filter events by Search input and Active Mappings
  const filteredEvents = React.useMemo(() => {
    const isTypeActive = (typeId: number) => {
      const matched = eventTypes.find(t => t.id === typeId)
      return matched ? matched.is_active !== false : true
    }

    return events
      .filter(evt => isTypeActive(evt.type))
      .filter(evt => {
        const query = appliedSearchTerm.toLowerCase().trim()
        if (!query) return true
        if (appliedSearchField === "device_id") {
          return evt.device_id.toLowerCase().includes(query)
        } else if (appliedSearchField === "hostname") {
          return (evt.details?.device_context?.hostname || "").toLowerCase().includes(query)
        } else if (appliedSearchField === "device") {
          return (evt.details?.device_context?.device_id || "").toLowerCase().includes(query)
        } else if (appliedSearchField === "device_type") {
          return (evt.details?.device_context?.device_type || "").toLowerCase().includes(query)
        } else {
          return evt.id.toLowerCase().includes(query)
        }
      })
  }, [events, appliedSearchTerm, appliedSearchField, eventTypes])

  // Paginate filtered events
  const paginatedEvents = React.useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredEvents.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredEvents, currentPage, itemsPerPage])

  const totalPages = Math.ceil(filteredEvents.length / itemsPerPage)

  const getCleanTimezoneName = (tz: string) => {
    return mapLabelToIana(tz)
  }

  const formatDateString = (timestamp: number, timezone: string) => {
    return formatTimestamp(timestamp, timezone)
  }

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedText(text)
    setTimeout(() => setCopiedText(null), 2000)
  }

  // Nested path values resolver
  const getNestedValue = (obj: any, path: string): any => {
    if (!obj) return undefined
    const parts = path.split('.')
    let current = obj
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part]
      } else {
        return undefined
      }
    }
    return current
  }

  const setNestedValue = (obj: any, path: string, value: any) => {
    if (!obj || typeof obj !== 'object') return
    const parts = path.split('.')
    let current = obj
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i]
      if (!current[part] || typeof current[part] !== 'object') {
        current[part] = {}
      }
      current = current[part]
    }
    current[parts[parts.length - 1]] = value
  }

  const formatDetailsWithTemplate = (details: any, template: string | undefined, typeId: number, fieldRules?: any[]): string => {
    let workingDetails = details ? JSON.parse(JSON.stringify(details)) : {}

    if (Array.isArray(fieldRules) && fieldRules.length > 0) {
      fieldRules.forEach(r => {
        if (!r.enabled || !r.field) return
        const actualVal = getNestedValue(workingDetails, r.field)
        if (actualVal !== undefined && actualVal !== null) {
          const strVal = String(actualVal).trim().toLowerCase()
          const target = (r.value || "").trim().toLowerCase()
          let match = false
          if (r.operator === "equals") match = strVal === target
          else if (r.operator === "not_equals") match = strVal !== target
          else if (r.operator === "contains") match = strVal.includes(target)
          else if (r.operator === "is_empty") match = strVal === "" || strVal === "null"
          else if (r.operator === "gt") match = Number(actualVal) > Number(r.value)
          else if (r.operator === "lt") match = Number(actualVal) < Number(r.value)

          if (match) {
            setNestedValue(workingDetails, r.field, r.display_text)
          }
        }
      })
    }

    if (!template) {
      return getFallbackDetailsSummary(workingDetails, typeId)
    }

    let output = template

    // 1. Resolve curly brace bindings e.g. {playback.playhead_position}
    const braceRegex = /\{([^}]+)\}/g
    output = output.replace(braceRegex, (match, path) => {
      const value = getNestedValue(workingDetails, path)
      return value !== undefined && value !== null ? String(value) : ""
    })

    // 2. Resolve bracketed bindings e.g. [content.platform]
    const bracketRegex = /\[([^\]]+)\]/g
    output = output.replace(bracketRegex, (match, path) => {
      const value = getNestedValue(workingDetails, path)
      return value !== undefined && value !== null ? `[${value}]` : ""
    })

    // 3. Fallback resolve common key words
    const commonKeys = ["title", "platform", "genre", "reason"]
    commonKeys.forEach(key => {
      if (output.includes(key)) {
        const val = getNestedValue(workingDetails, key) || getNestedValue(workingDetails, `content.${key}`)
        if (val !== undefined && val !== null) {
          output = output.replace(new RegExp(`\\b${key}\\b`, 'g'), String(val))
        }
      }
    })

    return output.trim()
  }

  const getFallbackDetailsSummary = (details: any, typeId: number): string => {
    switch (typeId) {
      case 1:
        return `[${details.content?.platform || ""}] ${details.content?.title || ""}`
      case 2:
        return `playhead: ${details.playback?.playhead_position || 0}s • bitrate: ${details.playback?.bitrate || ""} • downloaded: ${details.playback?.bytes_downloaded || 0} bytes`
      case 3:
        return `playhead: ${details.playhead_position || 0}s • reason: ${details.reason || ""} • volume: ${details.volume_level || 0}%`
      case 4:
        return `playhead: ${details.playhead_position || 0}s • reason: ${details.reason || ""} • paused: ${details.pause_duration_seconds || 0}s`
      case 5:
        return `playhead: ${details.playhead_position || 0}s • reason: ${details.reason || ""} • completion: ${details.completion_percentage || 0}%`
      case 6:
        return `reason: ${details.reason || ""} • new: ${details.new_content?.title || ""}`
      default:
        // Generic JSON extractor fallback for other custom event types
        if (!details || typeof details !== 'object') return "-"
        const summaries: string[] = []
        Object.entries(details).forEach(([key, val]) => {
          if (typeof val !== 'object' && val !== null) {
            summaries.push(`${key}: ${val}`)
          } else if (val && typeof val === 'object') {
            Object.entries(val).forEach(([subKey, subVal]) => {
              if (typeof subVal !== 'object' && subVal !== null) {
                summaries.push(`${key}.${subKey}: ${subVal}`)
              }
            })
          }
        })
        return summaries.slice(0, 3).join(" • ") || "-"
    }
  }

  // Dynamic Event Details Renderer
  const getDynamicDetails = React.useCallback((evt: EventLog) => {
    const matched = eventTypes.find(t => t.id === evt.type)
    return formatDetailsWithTemplate(evt.details, matched?.template, evt.type, matched?.field_rules)
  }, [eventTypes])

  const getPlatformIcon = (platform: string): string | null => {
    const p = platform.toLowerCase().trim()
    if (p.includes("youtube")) {
      return "https://rrckvqnaajywiyfberob.supabase.co/storage/v1/object/public/router-device-assets/ott-icons/youtube.jpeg"
    }
    if (p.includes("prime") || p.includes("amazon")) {
      return "https://rrckvqnaajywiyfberob.supabase.co/storage/v1/object/public/router-device-assets/ott-icons/amazon-prime.jpeg"
    }
    if (p.includes("jio") || p.includes("hotstar")) {
      return "https://rrckvqnaajywiyfberob.supabase.co/storage/v1/object/public/router-device-assets/ott-icons/jio-hotstar.jpeg"
    }
    if (p.includes("netflix")) {
      return "https://rrckvqnaajywiyfberob.supabase.co/storage/v1/object/public/router-device-assets/ott-icons/netflix.jpeg"
    }
    return null
  }

  const renderFormattedDetailsCell = (detailsText: string) => {
    // If the text contains [Platform] e.g. [YouTube] Wonders of Japan,
    // extract and render the platform as a sleek custom badge or icon!
    const match = detailsText.match(/^\[([^\]]+)\]\s*(.*)$/)
    if (match) {
      const platform = match[1]
      const title = match[2]
      const iconUrl = getPlatformIcon(platform)

      return (
        <div className="flex items-center gap-2 font-medium text-xs sm:text-sm">
          {iconUrl ? (
            <img
              src={iconUrl}
              alt={platform}
              className="size-5 rounded-md object-cover border border-border/80 shadow-2xs shrink-0 select-none"
              title={platform}
            />
          ) : (
            <span className="bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded text-xs font-mono font-semibold uppercase tracking-wider shrink-0 select-none">
              {platform}
            </span>
          )}
          <span className="text-foreground truncate" title={title}>{title}</span>
        </div>
      )
    }

    // If the text has bullet separators e.g. playhead: 843s • bitrate: 1080p
    if (detailsText.includes("•") || detailsText.includes("playhead:") || detailsText.includes("reason:")) {
      const parts = detailsText.split(/•|,/).map(p => p.trim())
      return (
        <div className="flex flex-wrap items-center gap-1.5 text-muted-foreground font-mono text-xs">
          {parts.map((p, i) => {
            const subParts = p.split(":")
            if (subParts.length === 2) {
              return (
                <span key={i} className="bg-muted/65 px-1.5 py-0.5 rounded border border-border/80">
                  <span className="text-muted-foreground/60">{subParts[0].trim()}:</span>
                  <span className="text-foreground font-semibold ml-1">{subParts[1].trim()}</span>
                </span>
              )
            }
            return (
              <span key={i} className="bg-muted/65 px-1.5 py-0.5 rounded border border-border/80 text-foreground font-medium">
                {p}
              </span>
            )
          })}
        </div>
      )
    }

    return <span className="text-muted-foreground font-medium">{detailsText}</span>
  }

  const getEventTypeName = (typeId: number) => {
    const matched = eventTypes.find(t => t.id === typeId)
    return matched ? matched.name : `TYPE_${typeId}`
  }

  const toggleColumn = (col: keyof typeof visibleColumns) => {
    setVisibleColumns(prev => ({ ...prev, [col]: !prev[col] }))
  }

  // Count active columns
  const activeColumnsCount = Object.values(visibleColumns).filter(Boolean).length

  return (
    <PageContainer
      title="Events Explorer"
      description={
        <span className="flex flex-wrap gap-2 items-center">
          <span>Audit and inspect play state telemetry event packets sent from active household router meters.</span>
          <span className="bg-primary/10 text-primary text-[10px] font-mono font-medium px-2 py-0.5 rounded border border-primary/20 shrink-0">
            Timezone: {getCleanTimezoneName(selectedTimezone)}
          </span>
        </span>
      }
    >

      {/* Main Database Grid Editor Container */}
      <div className="flex flex-col border border-border bg-card rounded-lg shadow-2xs overflow-hidden w-full min-w-0">
        {/* Supabase Table Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-muted/5 border-b border-border text-xs select-none">
          <div className="flex flex-wrap items-center gap-2">
            {/* Search Filter using ButtonGroup */}
            <ButtonGroup>
              <Select
                value={stagedSearchField}
                onValueChange={(val) => setStagedSearchField(val as any)}
              >
                <SelectTrigger className="h-8 text-xs font-mono font-medium bg-muted/20 border-border text-foreground">
                  <Search className="size-3.5 text-muted-foreground shrink-0 mr-1" />
                  <SelectValue placeholder="Field" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="device_id">device_id</SelectItem>
                  <SelectItem value="hostname">hostname</SelectItem>
                  <SelectItem value="device">device</SelectItem>
                  <SelectItem value="device_type">device_type</SelectItem>
                  <SelectItem value="id">event (id)</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="text"
                placeholder={`Filter by ${stagedSearchField}...`}
                value={stagedSearchTerm}
                onChange={(e) => setStagedSearchTerm(e.target.value)}
                className="h-8 text-xs w-44 sm:w-60 bg-background"
              />
              {stagedSearchTerm && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setStagedSearchTerm("")}
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  title="Clear search"
                >
                  <X className="size-3.5" />
                </Button>
              )}
            </ButtonGroup>

            {/* Event Type Filter */}
            <Select
              value={stagedTypeFilter}
              onValueChange={(val) => setStagedTypeFilter(val || "ALL")}
            >
              <SelectTrigger className="flex items-center gap-1.5 px-2.5 border border-border bg-background hover:bg-muted/30 rounded-md h-8 text-xs text-foreground font-medium cursor-pointer transition-all shadow-none focus:ring-0 focus:ring-offset-0">
                <SlidersHorizontal className="size-3.5 text-muted-foreground/60 shrink-0" />
                <SelectValue placeholder="All Event Types">
                  {stagedTypeFilter === "ALL"
                    ? "All Event Types"
                    : (eventTypes.find(t => t.id.toString() === stagedTypeFilter)?.name || `Type ${stagedTypeFilter}`)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Event Types</SelectItem>
                {eventTypes.filter(t => t.is_active !== false).map(t => (
                  <SelectItem key={t.id} value={t.id.toString()}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Date Range Picker using Shadcn Calendar and Popover */}
            <div className="flex items-center gap-1.5">
              <DateTimePicker
                date={stagedStartDateFilter}
                setDate={setStagedStartDateFilter}
                label="Start Date & Time"
              />
              <span className="text-xs text-muted-foreground/60 select-none">to</span>
              <DateTimePicker
                date={stagedEndDateFilter}
                setDate={setStagedEndDateFilter}
                label="End Date & Time"
              />
            </div>

            {/* Columns Select Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowColumnDropdown(!showColumnDropdown)}
                className="flex items-center gap-1.5 px-2.5 border border-border rounded-md h-8 bg-background hover:bg-muted/30 cursor-pointer text-xs text-foreground select-none font-medium transition-all"
              >
                <Columns3 className="size-3.5 shrink-0" />
                <span>Columns ({activeColumnsCount}/7)</span>
                <ChevronDown className="size-3 text-muted-foreground/60" />
              </button>

              {showColumnDropdown && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowColumnDropdown(false)} />
                  <div className="absolute left-0 mt-1.5 w-44 bg-popover border border-border rounded-lg shadow-lg z-20 p-2 text-xs text-foreground space-y-1">
                    <label className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-muted/50 rounded-md cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={visibleColumns.device_id}
                        onChange={() => toggleColumn("device_id")}
                        className="rounded border-border text-primary focus:ring-ring size-3.5"
                      />
                      <span>device_id</span>
                    </label>
                    <label className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-muted/50 rounded-md cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={visibleColumns.hostname}
                        onChange={() => toggleColumn("hostname")}
                        className="rounded border-border text-primary focus:ring-ring size-3.5"
                      />
                      <span>hostname</span>
                    </label>
                    <label className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-muted/50 rounded-md cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={visibleColumns.device}
                        onChange={() => toggleColumn("device")}
                        className="rounded border-border text-primary focus:ring-ring size-3.5"
                      />
                      <span>device</span>
                    </label>
                    <label className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-muted/50 rounded-md cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={visibleColumns.device_type}
                        onChange={() => toggleColumn("device_type")}
                        className="rounded border-border text-primary focus:ring-ring size-3.5"
                      />
                      <span>device_type</span>
                    </label>
                    <label className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-muted/50 rounded-md cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={visibleColumns.timestamp}
                        onChange={() => toggleColumn("timestamp")}
                        className="rounded border-border text-primary focus:ring-ring size-3.5"
                      />
                      <span>timestamp</span>
                    </label>
                    <label className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-muted/50 rounded-md cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={visibleColumns.type}
                        onChange={() => toggleColumn("type")}
                        className="rounded border-border text-primary focus:ring-ring size-3.5"
                      />
                      <span>type</span>
                    </label>
                    <label className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-muted/50 rounded-md cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={visibleColumns.details}
                        onChange={() => toggleColumn("details")}
                        className="rounded border-border text-primary focus:ring-ring size-3.5"
                      />
                      <span>details</span>
                    </label>
                  </div>
                </>
              )}
            </div>

            {/* Apply & Remove Filters Action Buttons using ButtonGroup */}
            {(hasChanges || isFilterApplied) && (
              <ButtonGroup>
                {hasChanges && (
                  <Button
                    onClick={handleApplyFilters}
                    size="sm"
                    className="h-8 font-semibold cursor-pointer flex items-center gap-1 animate-pulse"
                  >
                    <Check className="size-3.5" />
                    Apply
                  </Button>
                )}
                {isFilterApplied && (
                  <Button
                    onClick={handleClearFilters}
                    variant="destructive"
                    size="sm"
                    className="h-8 font-semibold transition-all cursor-pointer flex items-center gap-1"
                  >
                    <X className="size-3.5" />
                    Remove
                  </Button>
                )}
              </ButtonGroup>
            )}
          </div>

          {/* Right side Actions using ButtonGroup */}
          <div className="flex items-center gap-2">
            <ButtonGroup>
              <Select
                value={refreshInterval.toString()}
                onValueChange={(val) => setRefreshInterval(parseInt(val || "0"))}
              >
                <SelectTrigger className="h-8 text-xs sm:text-sm border border-border bg-background hover:bg-muted/30 text-foreground font-medium cursor-pointer shadow-none focus:ring-0 focus:ring-offset-0">
                  <span className="text-xs text-muted-foreground/70 select-none font-medium mr-1">Auto:</span>
                  <SelectValue placeholder="Interval">
                    {refreshInterval === 0 ? "Off" : refreshInterval === 10000 ? "10s" : refreshInterval === 30000 ? "30s" : refreshInterval === 60000 ? "1m" : refreshInterval === 300000 ? "5m" : `${refreshInterval / 1000}s`}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Off</SelectItem>
                  <SelectItem value="10000">10s</SelectItem>
                  <SelectItem value="30000">30s</SelectItem>
                  <SelectItem value="60000">1m</SelectItem>
                  <SelectItem value="300000">5m</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={handleRefresh}
                variant="outline"
                size="icon-sm"
                className="h-8 w-8 cursor-pointer shrink-0"
                title="Refresh logs"
              >
                <RefreshCw className={`size-3.5 text-muted-foreground ${isRefreshing ? "animate-spin" : ""}`} />
              </Button>
            </ButtonGroup>
          </div>
        </div>

        {/* Main Content Table (Hides columns dynamically based on state) */}
        <div className="overflow-x-auto w-full min-w-0 custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b bg-muted/10 text-xs font-semibold text-muted-foreground uppercase tracking-wider select-none font-mono">
                {visibleColumns.device_id && (
                  <th className="p-3 border-r border-border/40">
                    <div className="flex items-center gap-1.5">
                      <Type className="size-3 text-muted-foreground/60" />
                      <span>device_id</span>
                      <span className="text-[11px] text-muted-foreground/60 lowercase font-normal">text</span>
                    </div>
                  </th>
                )}
                {visibleColumns.hostname && (
                  <th className="p-3 border-r border-border/40">
                    <div className="flex items-center gap-1.5">
                      <Laptop className="size-3 text-muted-foreground/60" />
                      <span>hostname</span>
                      <span className="text-[11px] text-muted-foreground/60 lowercase font-normal">text</span>
                    </div>
                  </th>
                )}
                {visibleColumns.device && (
                  <th className="p-3 border-r border-border/40">
                    <div className="flex items-center gap-1.5">
                      <Server className="size-3 text-muted-foreground/60" />
                      <span>device</span>
                      <span className="text-[11px] text-muted-foreground/60 lowercase font-normal">text</span>
                    </div>
                  </th>
                )}
                {visibleColumns.device_type && (
                  <th className="p-3 border-r border-border/40">
                    <div className="flex items-center gap-1.5">
                      <Laptop className="size-3 text-muted-foreground/60" />
                      <span>device_type</span>
                      <span className="text-[11px] text-muted-foreground/60 lowercase font-normal">text</span>
                    </div>
                  </th>
                )}
                {visibleColumns.timestamp && (
                  <th className="p-3 border-r border-border/40">
                    <div className="flex items-center gap-1.5">
                      <Clock className="size-3 text-muted-foreground/60" />
                      <span>timestamp</span>
                      <span className="text-[11px] text-muted-foreground/60 lowercase font-normal">timestamptz</span>
                    </div>
                  </th>
                )}
                {visibleColumns.type && (
                  <th className="p-3 border-r border-border/40">
                    <div className="flex items-center gap-1.5">
                      <Link2 className="size-3 text-muted-foreground/60" />
                      <span>type</span>
                      <span className="text-[11px] text-muted-foreground/60 lowercase font-normal">int2</span>
                    </div>
                  </th>
                )}
                {visibleColumns.details && (
                  <th className="p-3">
                    <div className="flex items-center gap-1.5">
                      <Braces className="size-3 text-muted-foreground/60" />
                      <span>details</span>
                      <span className="text-[11px] text-muted-foreground/60 lowercase font-normal">jsonb</span>
                    </div>
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-xs sm:text-sm">
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={activeColumnsCount} className="p-8 text-center text-muted-foreground font-mono">
                    No records found matching filters
                  </td>
                </tr>
              ) : (
                paginatedEvents.map((evt) => {
                  const timestampStr = formatDateString(evt.timestamp, selectedTimezone)
                  const hostnameVal = evt.details?.device_context?.hostname || "-"
                  const deviceVal = evt.details?.device_context?.device_id || "-"
                  const deviceTypeVal = evt.details?.device_context?.device_type || "-"

                  return (
                    <tr
                      key={evt.id}
                      className={`transition-colors border-b border-border/40 ${
                        selectedEvent?.id === evt.id ? "bg-muted/20" : ""
                      }`}
                    >
                      {visibleColumns.device_id && (
                        <td className="p-3 font-medium text-foreground border-r border-border/40">
                          <div className="flex items-center justify-between gap-2 group/cell">
                            <span className="font-mono">{evt.device_id}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleCopyText(evt.device_id)
                              }}
                              className="opacity-0 group-hover/cell:opacity-100 p-1 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded transition-all cursor-pointer shrink-0"
                              title="Copy Device ID"
                            >
                              {copiedText === evt.device_id ? (
                                <Check className="size-3 text-primary" />
                              ) : (
                                <Copy className="size-3" />
                              )}
                            </button>
                          </div>
                        </td>
                      )}
                      {visibleColumns.hostname && (
                        <td className="p-3 font-medium text-foreground border-r border-border/40">
                          <div className="flex items-center justify-between gap-2 group/cell">
                            <span className="font-mono text-muted-foreground">{hostnameVal}</span>
                            {hostnameVal !== "-" && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleCopyText(hostnameVal)
                                }}
                                className="opacity-0 group-hover/cell:opacity-100 p-1 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded transition-all cursor-pointer shrink-0"
                                title="Copy Hostname"
                              >
                                {copiedText === hostnameVal ? (
                                  <Check className="size-3 text-primary" />
                                ) : (
                                  <Copy className="size-3" />
                                )}
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                      {visibleColumns.device && (
                        <td className="p-3 font-medium text-foreground border-r border-border/40">
                          <div className="flex items-center justify-between gap-2 group/cell">
                            <span className="font-mono text-muted-foreground">{deviceVal}</span>
                            {deviceVal !== "-" && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleCopyText(deviceVal)
                                }}
                                className="opacity-0 group-hover/cell:opacity-100 p-1 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded transition-all cursor-pointer shrink-0"
                                title="Copy Device Context ID"
                              >
                                {copiedText === deviceVal ? (
                                  <Check className="size-3 text-primary" />
                                ) : (
                                  <Copy className="size-3" />
                                )}
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                      {visibleColumns.device_type && (
                        <td className="p-3 font-medium text-foreground border-r border-border/40">
                          <div className="flex items-center justify-between gap-2 group/cell">
                            <span className="font-mono text-muted-foreground">{deviceTypeVal}</span>
                            {deviceTypeVal !== "-" && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleCopyText(deviceTypeVal)
                                }}
                                className="opacity-0 group-hover/cell:opacity-100 p-1 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded transition-all cursor-pointer shrink-0"
                                title="Copy Device Type"
                              >
                                {copiedText === deviceTypeVal ? (
                                  <Check className="size-3 text-primary" />
                                ) : (
                                  <Copy className="size-3" />
                                )}
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                      {visibleColumns.timestamp && (
                        <td className="p-3 text-muted-foreground font-mono border-r border-border/40">
                          {timestampStr}
                        </td>
                      )}
                      {visibleColumns.type && (
                        <td className="p-3 font-medium text-foreground border-r border-border/40">
                          <span className="bg-muted px-2.5 py-1 rounded-md text-xs font-mono border border-border" title={eventTypes.find(t => t.id === evt.type)?.description}>
                            {getEventTypeName(evt.type)}
                          </span>
                        </td>
                      )}
                      {visibleColumns.details && (
                        <td
                          onClick={() => {
                            setSelectedEvent(evt)
                            setActiveDetailTab("overview")
                          }}
                          className="p-3 font-medium text-foreground max-w-sm truncate cursor-pointer hover:bg-primary/5 transition-colors"
                          title="Click to view details"
                        >
                          {renderFormattedDetailsCell(getDynamicDetails(evt))}
                        </td>
                      )}
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      {filteredEvents.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-4 border border-border bg-card px-4 py-3 rounded-lg text-xs text-muted-foreground select-none">
          <div className="flex items-center gap-4">
            <span>
              Showing <span className="font-semibold text-foreground">{Math.min((currentPage - 1) * itemsPerPage + 1, filteredEvents.length)}</span> to{" "}
              <span className="font-semibold text-foreground">{Math.min(currentPage * itemsPerPage, filteredEvents.length)}</span> of{" "}
              <span className="font-semibold text-foreground">{filteredEvents.length}</span> events
            </span>

            {/* Items Per Page Selector */}
            <div className="flex items-center gap-1.5">
              <span>Items per page:</span>
              <Select
                value={itemsPerPage.toString()}
                onValueChange={(val) => {
                  setItemsPerPage(parseInt(val || "10"))
                  setCurrentPage(1)
                }}
              >
                <SelectTrigger className="w-16 h-8 text-xs cursor-pointer bg-background border border-border">
                  <SelectValue placeholder="Size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Pagination Controls using ButtonGroup */}
          <ButtonGroup>
            <Button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              variant="outline"
              size="sm"
              className="h-8 cursor-pointer text-xs"
              title="First page"
            >
              <ChevronsLeft className="size-3.5" />
              <span className="hidden sm:inline">First</span>
            </Button>
            <Button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              variant="outline"
              size="sm"
              className="h-8 cursor-pointer text-xs"
              title="Previous page"
            >
              <ChevronLeft className="size-3.5" />
              <span className="hidden sm:inline">Prev</span>
            </Button>
            <ButtonGroupText className="h-8 font-mono text-xs px-3 font-semibold text-foreground bg-muted/30 border-border">
              Page {currentPage} of {totalPages || 1}
            </ButtonGroupText>
            <Button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage >= totalPages}
              variant="outline"
              size="sm"
              className="h-8 cursor-pointer text-xs"
              title="Next page"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="size-3.5" />
            </Button>
            <Button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage >= totalPages}
              variant="outline"
              size="sm"
              className="h-8 cursor-pointer text-xs"
              title="Last page"
            >
              <span className="hidden sm:inline">Last</span>
              <ChevronsRight className="size-3.5" />
            </Button>
          </ButtonGroup>
        </div>
      )}

      {/* Overlay Slide-over Sheet Details */}
      {selectedEvent && (
        <>
          {/* Overlay backdrop */}
          <div
            onClick={() => setSelectedEvent(null)}
            className="fixed inset-0 z-40 bg-black/45 backdrop-blur-xs transition-opacity duration-300"
          />

          {/* Sheet overlay panel */}
          <div className="fixed inset-y-0 right-0 w-full sm:w-[500px] z-50 bg-background border-l border-border shadow-2xl flex flex-col transition-transform duration-300 translate-x-0 text-left">
            {/* Header Tabs using ButtonGroup */}
            <div className="flex items-center justify-between border-b border-border px-4 py-2 shrink-0 bg-muted/5">
              <ButtonGroup className="bg-muted/20 p-0.5 rounded-lg border border-border">
                <Button
                  onClick={() => setActiveDetailTab("overview")}
                  variant={activeDetailTab === "overview" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 text-xs font-semibold cursor-pointer"
                >
                  Overview
                </Button>
                <Button
                  onClick={() => setActiveDetailTab("logs")}
                  variant={activeDetailTab === "logs" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 text-xs font-semibold cursor-pointer"
                >
                  Logs
                </Button>
                <Button
                  onClick={() => setActiveDetailTab("raw")}
                  variant={activeDetailTab === "raw" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 text-xs font-semibold cursor-pointer"
                >
                  Raw JSON
                </Button>
              </ButtonGroup>
              <button
                onClick={() => setSelectedEvent(null)}
                className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted/40 rounded-lg transition-colors cursor-pointer"
              >
                <X className="size-4.5" />
              </button>
            </div>

            {/* Scrollable Viewport */}
            <div className="flex-1 overflow-y-auto p-5 text-left">
              {activeDetailTab === "overview" && (
                <div className="space-y-6">
                  {/* Title Header */}
                  <div>
                    <h2 className="text-base font-semibold text-foreground font-mono">
                      {selectedEvent.details.device_context?.hostname || selectedEvent.device_id}
                    </h2>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-xs text-muted-foreground font-mono">
                        {selectedEvent.details.device_context?.ip_address || "No IP Address"}
                      </span>
                      {selectedEvent.details.device_context?.ip_address && (
                        <button
                          onClick={() => handleCopyText(selectedEvent.details.device_context?.ip_address || "")}
                          className="p-0.5 text-muted-foreground hover:text-foreground rounded transition-colors cursor-pointer"
                          title="Copy IP Address"
                        >
                          {copiedText === selectedEvent.details.device_context?.ip_address ? (
                            <Check className="size-3 text-primary" />
                          ) : (
                            <Copy className="size-3" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  <hr className="border-border/60" />

                  {/* Attributes Grid List */}
                  <div className="space-y-3.5 text-xs">
                    <div className="flex justify-between items-center border-b border-border/30 pb-2">
                      <span className="text-muted-foreground">Event UID</span>
                      <span className="font-mono text-[10px] text-foreground font-semibold select-all">
                        {selectedEvent.id}
                      </span>
                    </div>
                    <div className="flex justify-between items-center border-b border-border/30 pb-2">
                      <span className="text-muted-foreground">Timestamp</span>
                      <span className="font-medium text-foreground font-mono">
                        {formatDateString(selectedEvent.timestamp, selectedTimezone)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center border-b border-border/30 pb-2">
                      <span className="text-muted-foreground">Event Type</span>
                      <span className="font-medium text-foreground bg-muted/80 px-2 py-0.5 rounded border">
                        {getEventTypeName(selectedEvent.type)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center border-b border-border/30 pb-2">
                      <span className="text-muted-foreground">Platform</span>
                      <span className="font-medium text-foreground">
                        {selectedEvent.details.content?.platform || "-"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center border-b border-border/30 pb-2">
                      <span className="text-muted-foreground">Content Title</span>
                      <span className="font-medium text-foreground truncate max-w-[260px] text-right" title={selectedEvent.details.content?.title}>
                        {selectedEvent.details.content?.title || "-"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center border-b border-border/30 pb-2">
                      <span className="text-muted-foreground">OS / Client</span>
                      <span className="font-medium text-foreground">
                        {selectedEvent.details.device_context?.os || "-"} ({selectedEvent.details.device_context?.device_type || "-"})
                      </span>
                    </div>
                    <div className="flex justify-between items-center border-b border-border/30 pb-2">
                      <span className="text-muted-foreground">Audio Language</span>
                      <span className="font-medium text-foreground">
                        {selectedEvent.details.content?.audio_language || "-"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pb-1">
                      <span className="text-muted-foreground">SSO Provider</span>
                      <span className="font-medium text-foreground flex items-center gap-1">
                        <Check className="size-3.5 text-primary bg-primary/10 rounded-full p-0.5" />
                        <span>Connected</span>
                      </span>
                    </div>
                  </div>

                  <hr className="border-border/60" />

                  {/* Provider Information Section */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wider font-mono">
                      Provider Information
                    </h3>
                    <div className="flex items-center gap-3 p-3 border border-border rounded-lg bg-muted/10">
                      <div className="p-2 bg-primary/10 text-primary rounded-md">
                        <Server className="size-4" />
                      </div>
                      <div className="flex flex-col text-left">
                        <span className="font-semibold text-xs text-foreground">
                          {selectedEvent.details.content?.platform || "Router Meter Engine"}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          API Stream Identifier: {selectedEvent.details.household_context?.router_id || "RM0002"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeDetailTab === "logs" && (
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-2">
                    Device State Logs
                  </h3>
                  <div className="space-y-3 font-mono text-[10px] text-muted-foreground leading-relaxed">
                    <div className="p-2 border-b border-border/40">
                      <span className="text-primary font-semibold">[INFO]</span> {formatDateString(selectedEvent.timestamp, selectedTimezone)} - play stream initialized for device {selectedEvent.device_id}.
                    </div>
                    <div className="p-2 border-b border-border/40">
                      <span className="text-blue-500 font-semibold">[PING]</span> {formatDateString(selectedEvent.timestamp + 57, selectedTimezone)} - playback heartbeat ping received. Bitrate: {selectedEvent.details.playback?.bitrate || "1080p"}.
                    </div>
                    <div className="p-2">
                      <span className="text-zinc-500 font-semibold">[DEBUG]</span> {formatDateString(selectedEvent.timestamp + 120, selectedTimezone)} - state sync checked.
                    </div>
                  </div>
                </div>
              )}

              {activeDetailTab === "raw" && (
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-1">
                    Raw JSON Event Payload
                  </h3>
                  <div className="relative group bg-[#121212] border border-border rounded-lg max-h-[480px] overflow-hidden flex flex-col">
                    <button
                      onClick={() => handleCopyText(JSON.stringify(selectedEvent, null, 2))}
                      className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1.5 rounded bg-zinc-800/80 hover:bg-zinc-700/80 border border-zinc-700 text-zinc-300 hover:text-white transition-all cursor-pointer shadow-sm flex items-center justify-center z-10"
                      title="Copy raw JSON"
                    >
                      {copiedText === JSON.stringify(selectedEvent, null, 2) ? (
                        <Check className="size-3.5 text-primary" />
                      ) : (
                        <Copy className="size-3.5" />
                      )}
                    </button>
                    <div className="p-4 overflow-auto max-h-[440px]">
                      <pre className="text-[10.5px] text-zinc-300 font-mono leading-relaxed select-all whitespace-pre-wrap break-all pr-8">
                        {JSON.stringify(selectedEvent, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </PageContainer>
  )
}

function DateTimePicker({
  date,
  setDate,
  label,
}: {
  date: Date | undefined
  setDate: (d: Date | undefined) => void
  label: string
}) {
  const [time, setTime] = React.useState(date ? format(date, "HH:mm") : "00:00")

  // Sync internal time when date is reset externally
  React.useEffect(() => {
    if (date) {
      setTime(format(date, "HH:mm"))
    } else {
      setTime("00:00")
    }
  }, [date])

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (!selectedDate) {
      setDate(undefined)
      return
    }
    const [hours, minutes] = time.split(":").map(Number)
    const newDate = new Date(selectedDate)
    newDate.setHours(hours || 0, minutes || 0, 0, 0)
    setDate(newDate)
  }

  const handleTimeChange = (newTime: string) => {
    setTime(newTime)
    if (date) {
      const [hours, minutes] = newTime.split(":").map(Number)
      const newDate = new Date(date)
      newDate.setHours(hours || 0, minutes || 0, 0, 0)
      setDate(newDate)
    }
  }

  return (
    <Popover>
      <PopoverTrigger className="flex items-center gap-1.5 px-2.5 h-8 border border-border bg-background rounded-md text-xs text-foreground hover:bg-muted/30 cursor-pointer font-medium transition-all select-none">
        <CalendarIcon className="size-3.5 text-muted-foreground/60 shrink-0" />
        <span>
          {date ? format(date, "yyyy-MM-dd HH:mm") : label}
        </span>
      </PopoverTrigger>
      <PopoverContent className="p-3 w-auto bg-popover border border-border shadow-md rounded-lg flex flex-col gap-2 z-50">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleDateSelect}
        />
        <div className="flex items-center gap-2 border-t border-border/50 pt-2 text-xs">
          <span className="text-muted-foreground font-medium select-none">Time:</span>
          <input
            type="time"
            value={time}
            onChange={(e) => handleTimeChange(e.target.value)}
            className="flex-1 bg-background border border-border rounded px-2 py-1 text-xs text-foreground font-mono outline-hidden focus:ring-1 focus:ring-ring/50"
          />
          {date && (
            <button
              onClick={() => {
                setDate(undefined)
                setTime("00:00")
              }}
              className="text-[10px] text-destructive hover:underline cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
