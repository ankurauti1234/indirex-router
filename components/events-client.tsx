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
  mac_address?: string
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

export interface FilterChip {
  id: string
  field: "device_id" | "device_type" | "hostname" | "device" | "id" | "text"
  value: string
}

// Helper to set time (HH:mm) on a Date object
const setTimeToDate = (date: Date, timeStr: string): Date => {
  const [hoursStr, minutesStr] = timeStr.split(":")
  const hours = parseInt(hoursStr || "0", 10)
  const minutes = parseInt(minutesStr || "0", 10)
  
  const newDate = new Date(date)
  newDate.setHours(hours, minutes, 0, 0)
  return newDate
}

// Helper to format Date to HH:mm string for time inputs
const formatTimeToHHMM = (date?: Date): string => {
  if (!date) return "00:00"
  const h = String(date.getHours()).padStart(2, "0")
  const m = String(date.getMinutes()).padStart(2, "0")
  return `${h}:${m}`
}

export function EventsClient() {
  const { selectedTimezone } = useTimezoneStore()
  const [events, setEvents] = React.useState<EventLog[]>([])
  const [eventTypes, setEventTypes] = React.useState<EventType[]>([])
  const [selectedEvent, setSelectedEvent] = React.useState<EventLog | null>(null)
  
  // Intelligent Chip-based Search Filters
  const [stagedChips, setStagedChips] = React.useState<FilterChip[]>([])
  const [appliedChips, setAppliedChips] = React.useState<FilterChip[]>([])
  const [stagedSearchField, setStagedSearchField] = React.useState<FilterChip["field"]>("device_id")
  const [stagedSearchTerm, setStagedSearchTerm] = React.useState("")
  const [showSuggestions, setShowSuggestions] = React.useState(false)

  const [stagedTypeFilter, setStagedTypeFilter] = React.useState<string>("ALL")
  const [stagedDateRange, setStagedDateRange] = React.useState<DateRange | undefined>(undefined)
  const stagedStartDateFilter = stagedDateRange?.from
  const stagedEndDateFilter = stagedDateRange?.to

  const [appliedTypeFilter, setAppliedTypeFilter] = React.useState<string>("ALL")
  const [appliedDateRange, setAppliedDateRange] = React.useState<DateRange | undefined>(undefined)
  const appliedStartDateFilter = appliedDateRange?.from
  const appliedEndDateFilter = appliedDateRange?.to

  // Auto Refresh Interval selector state (default: 60 sec i.e. 60000 ms)
  const [refreshInterval, setRefreshInterval] = React.useState<number>(60000)

  // Pagination settings
  const [currentPage, setCurrentPage] = React.useState(1)
  const [itemsPerPage, setItemsPerPage] = React.useState(25)

  // Column resizing state
  const [colWidths, setColWidths] = React.useState<Record<string, number>>({
    device_id: 160,
    hostname: 160,
    device: 140,
    device_type: 140,
    timestamp: 190,
    type: 170,
    details: 380,
  })

  const handleColumnResize = (e: React.MouseEvent, colKey: string) => {
    e.preventDefault()
    e.stopPropagation()
    const startX = e.clientX
    const startWidth = colWidths[colKey] || 150
    document.body.style.userSelect = "none"
    document.body.style.cursor = "col-resize"

    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX
      const newWidth = Math.max(35, startWidth + delta)
      setColWidths((prev) => ({
        ...prev,
        [colKey]: newWidth,
      }))
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

  // Chip management handlers
  const handleAddChip = (fieldParam?: FilterChip["field"], valueParam?: string) => {
    const targetField = fieldParam || stagedSearchField
    const targetValue = (valueParam !== undefined ? valueParam : stagedSearchTerm).trim()
    if (!targetValue) return

    const isDuplicate = stagedChips.some(c => c.field === targetField && c.value.toLowerCase() === targetValue.toLowerCase())
    if (!isDuplicate) {
      const newChip: FilterChip = {
        id: Math.random().toString(36).substring(2, 9),
        field: targetField,
        value: targetValue,
      }
      const updated = [...stagedChips, newChip]
      setStagedChips(updated)
      setAppliedChips(updated)
    }

    setStagedSearchTerm("")
    setShowSuggestions(false)
  }

  const handleRemoveChip = (chipId: string) => {
    const updated = stagedChips.filter(c => c.id !== chipId)
    setStagedChips(updated)
    setAppliedChips(updated)
  }

  // Dynamic unique lists for Autocomplete Suggestions
  const uniqueDeviceIds = React.useMemo(() => {
    const ids = events.map(e => e.device_id).filter((val): val is string => Boolean(val))
    return Array.from(new Set(ids)).sort()
  }, [events])

  const uniqueDeviceTypes = React.useMemo(() => {
    const types = events.map(e => e.details?.device_context?.device_type).filter((val): val is string => Boolean(val))
    return Array.from(new Set(types)).sort()
  }, [events])

  const uniqueHostnames = React.useMemo(() => {
    const names = events.map(e => e.details?.device_context?.hostname).filter((val): val is string => Boolean(val))
    return Array.from(new Set(names)).sort()
  }, [events])

  const suggestions = React.useMemo(() => {
    const term = stagedSearchTerm.toLowerCase().trim()
    let list: string[] = []

    if (stagedSearchField === "device_id") list = uniqueDeviceIds
    else if (stagedSearchField === "device_type") list = uniqueDeviceTypes
    else if (stagedSearchField === "hostname") list = uniqueHostnames

    const existingValuesForField = new Set(stagedChips.filter(c => c.field === stagedSearchField).map(c => c.value.toLowerCase()))
    const filteredList = list.filter(item => !existingValuesForField.has(item.toLowerCase()))

    if (!term) return filteredList.slice(0, 8)
    return filteredList.filter(item => item.toLowerCase().includes(term)).slice(0, 8)
  }, [stagedSearchField, stagedSearchTerm, uniqueDeviceIds, uniqueDeviceTypes, uniqueHostnames, stagedChips])

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1)
  }, [appliedChips, appliedTypeFilter, appliedStartDateFilter, appliedEndDateFilter])

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
    stagedChips.length !== appliedChips.length ||
    stagedSearchTerm.trim() !== "" ||
    stagedTypeFilter !== appliedTypeFilter ||
    stagedDateRange?.from?.getTime() !== appliedDateRange?.from?.getTime() ||
    stagedDateRange?.to?.getTime() !== appliedDateRange?.to?.getTime()

  const isFilterApplied = 
    appliedChips.length > 0 ||
    appliedTypeFilter !== "ALL" ||
    appliedDateRange !== undefined

  const handleApplyFilters = () => {
    let currentChips = [...stagedChips]
    if (stagedSearchTerm.trim()) {
      const pendingVal = stagedSearchTerm.trim()
      const isDuplicate = currentChips.some(c => c.field === stagedSearchField && c.value.toLowerCase() === pendingVal.toLowerCase())
      if (!isDuplicate) {
        const newChip: FilterChip = {
          id: Math.random().toString(36).substring(2, 9),
          field: stagedSearchField,
          value: pendingVal,
        }
        currentChips.push(newChip)
        setStagedChips(currentChips)
        setStagedSearchTerm("")
      }
    }

    setAppliedChips(currentChips)
    setAppliedTypeFilter(stagedTypeFilter)
    setAppliedDateRange(stagedDateRange)
    setShowSuggestions(false)
  }

  const handleClearFilters = () => {
    setStagedChips([])
    setStagedSearchTerm("")
    setStagedSearchField("device_id")
    setStagedTypeFilter("ALL")
    setStagedDateRange(undefined)

    setAppliedChips([])
    setAppliedTypeFilter("ALL")
    setAppliedDateRange(undefined)
    setShowSuggestions(false)
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
            is_active: d.is_active !== undefined ? d.is_active : true,
            structure: rule?.structure || null,
            sample: rule?.sample || null,
            template: templateText,
            field_rules: fieldRules,
          }
        })
        setEventTypes(formatted)
      }

      // 2. Fetch ALL Telemetry Events from "playback_events" table in 1000-row chunks to bypass PostgREST limits
      let eventsData: any[] = []
      let pageIndex = 0
      const pageSize = 1000
      let hasMore = true
      let fetchError = false

      while (hasMore) {
        let query = supabase.from("playback_events").select("*")

        if (appliedTypeFilter !== "ALL") {
          query = query.eq("type", parseInt(appliedTypeFilter, 10))
        }
        if (appliedStartDateFilter) {
          query = query.gte("timestamp", appliedStartDateFilter.toISOString())
        }
        if (appliedEndDateFilter) {
          query = query.lte("timestamp", appliedEndDateFilter.toISOString())
        }

        const { data, error } = await query
          .order("timestamp", { ascending: false })
          .range(pageIndex * pageSize, (pageIndex + 1) * pageSize - 1)

        if (error) {
          console.error("Error fetching events chunk:", error)
          fetchError = true
          hasMore = false
        } else if (data && data.length > 0) {
          eventsData.push(...data)
          if (data.length < pageSize) {
            hasMore = false
          } else {
            pageIndex++
          }
        } else {
          hasMore = false
        }
      }

      if (!fetchError && eventsData.length > 0) {
        const parseTimestampToUnix = (tsVal: any): number => {
          if (typeof tsVal === "number") {
            return tsVal < 1e11 ? tsVal : Math.floor(tsVal / 1000)
          }
          if (!tsVal) return Math.floor(Date.now() / 1000)
          
          let str = String(tsVal).trim()
          if (str.includes(" ") && !str.includes("T")) {
            str = str.replace(" ", "T")
          }
          const parsedMs = new Date(str).getTime()
          return isNaN(parsedMs) ? Math.floor(Date.now() / 1000) : Math.floor(parsedMs / 1000)
        }

        const formatted: EventLog[] = eventsData.map((d: any) => {
          let detailsObj: any = {}
          if (typeof d.details === "string") {
            try {
              detailsObj = JSON.parse(d.details)
            } catch {
              detailsObj = {}
            }
          } else if (d.details && typeof d.details === "object") {
            detailsObj = d.details
          }

          return {
            id: String(d.id),
            device_id: String(d.device_id || ""),
            timestamp: parseTimestampToUnix(d.timestamp),
            type: typeof d.type === "number" ? d.type : parseInt(d.type || "0", 10),
            details: detailsObj,
          }
        })

        // Sort descending by timestamp
        formatted.sort((a, b) => b.timestamp - a.timestamp)
        setEvents(formatted)
      } else {
        setEvents([])
      }
    } catch (e) {
      console.error(e)
      setEvents([])
    }
  }, [supabase, appliedTypeFilter, appliedStartDateFilter, appliedEndDateFilter])

  // Trigger manual refresh
  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetchSupabaseData()
    setTimeout(() => setIsRefreshing(false), 600)
  }

  // Initial and Automatic polling responsive to refreshInterval
  React.useEffect(() => {
    fetchSupabaseData()
    if (refreshInterval === 0) return
    const interval = setInterval(fetchSupabaseData, refreshInterval)
    return () => clearInterval(interval)
  }, [fetchSupabaseData, refreshInterval])

  // Filter events by Active Filter Chips
  const filteredEvents = React.useMemo(() => {
    return events.filter(evt => {
      // 1. Check all Applied Filter Chips (AND logic)
      for (const chip of appliedChips) {
        const val = chip.value.toLowerCase().trim()
        if (!val) continue

        if (chip.field === "device_id") {
          if (!(evt.device_id || "").toLowerCase().includes(val)) return false
        } else if (chip.field === "hostname") {
          if (!(evt.details?.device_context?.hostname || "").toLowerCase().includes(val)) return false
        } else if (chip.field === "device") {
          if (!(evt.details?.device_context?.device_id || "").toLowerCase().includes(val)) return false
        } else if (chip.field === "device_type") {
          if (!(evt.details?.device_context?.device_type || "").toLowerCase().includes(val)) return false
        } else if (chip.field === "id") {
          if (!(evt.id || "").toLowerCase().includes(val)) return false
        } else {
          // text / all fields match
          const textMatch =
            (evt.device_id || "").toLowerCase().includes(val) ||
            (evt.id || "").toLowerCase().includes(val) ||
            (evt.details?.device_context?.hostname || "").toLowerCase().includes(val) ||
            (evt.details?.device_context?.device_id || "").toLowerCase().includes(val) ||
            (evt.details?.device_context?.device_type || "").toLowerCase().includes(val) ||
            JSON.stringify(evt.details || {}).toLowerCase().includes(val)
          if (!textMatch) return false
        }
      }

      return true
    })
  }, [events, appliedChips])

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
    return findPlatformIconUrl(platform)
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
            {/* Intelligent Chip-based Search Bar matching exact filter UI design */}
            <div className="relative flex items-center shrink-0">
              <ButtonGroup className="h-8">
                {/* Field Selector Dropdown */}
                <Select
                  value={stagedSearchField}
                  onValueChange={(val) => {
                    setStagedSearchField(val as any)
                    setShowSuggestions(true)
                  }}
                >
                  <SelectTrigger className="h-8 text-xs font-mono font-medium bg-background hover:bg-muted/30 border border-border border-r-0 rounded-r-none text-foreground px-2.5 focus:ring-0 focus:ring-offset-0 shrink-0">
                    <Search className="size-3.5 text-muted-foreground shrink-0 mr-1" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="device_id">device_id</SelectItem>
                    <SelectItem value="device_type">device_type</SelectItem>
                    <SelectItem value="hostname">hostname</SelectItem>
                    <SelectItem value="device">device</SelectItem>
                    <SelectItem value="id">event (id)</SelectItem>
                    <SelectItem value="text">text</SelectItem>
                  </SelectContent>
                </Select>

                {/* Input & Chips Box */}
                <div className="flex items-center gap-1.5 px-2 bg-background border border-border border-l-0 rounded-r-md h-8 min-w-[240px] max-w-md focus-within:ring-1 focus-within:ring-ring focus-within:border-ring transition-all">
                  {/* Active Filter Chips */}
                  {stagedChips.map((chip) => (
                    <span
                      key={chip.id}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-mono bg-muted text-foreground border border-border shrink-0"
                    >
                      <span className="font-semibold text-muted-foreground uppercase text-[9px]">{chip.field}:</span>
                      <span className="font-medium max-w-[100px] truncate">{chip.value}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveChip(chip.id)}
                        className="hover:bg-muted-foreground/20 p-0.5 rounded text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                        title="Remove chip"
                      >
                        <X className="size-2.5" />
                      </button>
                    </span>
                  ))}

                  {/* Input field */}
                  <input
                    type="text"
                    placeholder={stagedChips.length > 0 ? "Add filter..." : `Filter by ${stagedSearchField}...`}
                    value={stagedSearchTerm}
                    onFocus={() => setShowSuggestions(true)}
                    onChange={(e) => {
                      setStagedSearchTerm(e.target.value)
                      setShowSuggestions(true)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        handleAddChip()
                      } else if (e.key === "Backspace" && !stagedSearchTerm && stagedChips.length > 0) {
                        handleRemoveChip(stagedChips[stagedChips.length - 1].id)
                      }
                    }}
                    className="h-full text-xs bg-transparent border-0 outline-none flex-1 font-mono text-foreground placeholder:text-muted-foreground/50 min-w-[80px]"
                  />

                  {stagedSearchTerm.trim() && (
                    <button
                      type="button"
                      onClick={() => handleAddChip()}
                      className="h-5 px-1.5 text-[10px] font-mono font-medium bg-muted hover:bg-muted/80 text-foreground border border-border rounded cursor-pointer shrink-0 transition-colors"
                      title="Add filter chip (Press Enter)"
                    >
                      + Add
                    </button>
                  )}
                </div>
              </ButtonGroup>

              {/* Autocomplete Suggestions Popover */}
              {showSuggestions && suggestions.length > 0 && (
                <div
                  className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-md z-50 py-1 font-mono text-xs max-h-48 overflow-y-auto custom-scrollbar"
                  onMouseDown={(e) => e.preventDefault()}
                >
                  <div className="px-2.5 py-1 text-[10px] uppercase font-semibold text-muted-foreground/70 border-b border-border/50">
                    Suggested {stagedSearchField}s
                  </div>
                  {suggestions.map((sug) => (
                    <div
                      key={sug}
                      onClick={() => handleAddChip(stagedSearchField, sug)}
                      className="px-2.5 py-1.5 hover:bg-accent hover:text-accent-foreground cursor-pointer flex items-center justify-between text-xs"
                    >
                      <span className="font-mono">{sug}</span>
                      <span className="text-[10px] text-muted-foreground">+ Add chip</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

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

            {/* Date & Time Range Picker with 2 Side-by-Side Calendars & Time Inputs */}
            <Popover>
              <PopoverTrigger
                render={
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-8 px-2.5 text-xs border border-border bg-background hover:bg-muted/30 font-medium justify-start text-left shrink-0 cursor-pointer shadow-none",
                      !stagedDateRange?.from && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="size-3.5 mr-1.5 text-muted-foreground/70 shrink-0" />
                    {stagedDateRange?.from ? (
                      stagedDateRange.to ? (
                        <span className="font-mono text-foreground font-medium">
                          {format(stagedDateRange.from, "LLL dd, y HH:mm")} – {format(stagedDateRange.to, "LLL dd, y HH:mm")}
                        </span>
                      ) : (
                        <span className="font-mono text-foreground font-medium">
                          {format(stagedDateRange.from, "LLL dd, y HH:mm")}
                        </span>
                      )
                    ) : (
                      <span>Pick Date & Time Range</span>
                    )}
                  </Button>
                }
              />
              <PopoverContent className="w-auto p-0" align="start">
                <div className="p-2 border-b border-border flex items-center justify-between bg-muted/20">
                  <span className="text-xs font-semibold text-foreground px-2">Select Date & Time Range</span>
                  {stagedDateRange?.from && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setStagedDateRange(undefined)}
                      className="h-6 text-[11px] text-muted-foreground hover:text-foreground px-2"
                    >
                      Clear range
                    </Button>
                  )}
                </div>
                <Calendar
                  mode="range"
                  defaultMonth={stagedDateRange?.from}
                  selected={stagedDateRange}
                  onSelect={setStagedDateRange}
                  numberOfMonths={2}
                />
                {/* Time Selection Inputs Footer */}
                <div className="p-2.5 border-t border-border bg-muted/10 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-1.5">
                    <Clock className="size-3.5 text-muted-foreground shrink-0" />
                    <span className="font-medium text-foreground">Start:</span>
                    <input
                      type="time"
                      disabled={!stagedDateRange?.from}
                      value={formatTimeToHHMM(stagedDateRange?.from)}
                      onChange={(e) => {
                        if (!stagedDateRange?.from) return
                        const updatedFrom = setTimeToDate(stagedDateRange.from, e.target.value)
                        setStagedDateRange({
                          from: updatedFrom,
                          to: stagedDateRange.to,
                        })
                      }}
                      className="h-7 text-xs font-mono bg-background border border-border rounded px-1.5 focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Clock className="size-3.5 text-muted-foreground shrink-0" />
                    <span className="font-medium text-foreground">End:</span>
                    <input
                      type="time"
                      disabled={!stagedDateRange?.to}
                      value={formatTimeToHHMM(stagedDateRange?.to)}
                      onChange={(e) => {
                        if (!stagedDateRange?.to) return
                        const updatedTo = setTimeToDate(stagedDateRange.to, e.target.value)
                        setStagedDateRange({
                          from: stagedDateRange.from,
                          to: updatedTo,
                        })
                      }}
                      className="h-7 text-xs font-mono bg-background border border-border rounded px-1.5 focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 cursor-pointer"
                    />
                  </div>
                </div>
              </PopoverContent>
            </Popover>

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
                  <th
                    style={{ width: `${colWidths.device_id || 160}px`, minWidth: `${colWidths.device_id || 160}px` }}
                    className="p-3 border-r border-border/40 relative group/th"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <Type className="size-3 text-muted-foreground/60 shrink-0" />
                      <span className="truncate">device_id</span>
                      <span className="text-[11px] text-muted-foreground/60 lowercase font-normal shrink-0">text</span>
                    </div>
                    <div
                      onMouseDown={(e) => handleColumnResize(e, "device_id")}
                      className="absolute right-0 top-0 bottom-0 w-2.5 cursor-col-resize hover:bg-primary/50 active:bg-primary z-20 opacity-0 group-hover/th:opacity-100 transition-opacity"
                      title="Drag to resize column"
                    />
                  </th>
                )}
                {visibleColumns.hostname && (
                  <th
                    style={{ width: `${colWidths.hostname || 160}px`, minWidth: `${colWidths.hostname || 160}px` }}
                    className="p-3 border-r border-border/40 relative group/th"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <Laptop className="size-3 text-muted-foreground/60 shrink-0" />
                      <span className="truncate">hostname</span>
                      <span className="text-[11px] text-muted-foreground/60 lowercase font-normal shrink-0">text</span>
                    </div>
                    <div
                      onMouseDown={(e) => handleColumnResize(e, "hostname")}
                      className="absolute right-0 top-0 bottom-0 w-2.5 cursor-col-resize hover:bg-primary/50 active:bg-primary z-20 opacity-0 group-hover/th:opacity-100 transition-opacity"
                      title="Drag to resize column"
                    />
                  </th>
                )}
                {visibleColumns.device && (
                  <th
                    style={{ width: `${colWidths.device || 140}px`, minWidth: `${colWidths.device || 140}px` }}
                    className="p-3 border-r border-border/40 relative group/th"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <Server className="size-3 text-muted-foreground/60 shrink-0" />
                      <span className="truncate">device</span>
                      <span className="text-[11px] text-muted-foreground/60 lowercase font-normal shrink-0">text</span>
                    </div>
                    <div
                      onMouseDown={(e) => handleColumnResize(e, "device")}
                      className="absolute right-0 top-0 bottom-0 w-2.5 cursor-col-resize hover:bg-primary/50 active:bg-primary z-20 opacity-0 group-hover/th:opacity-100 transition-opacity"
                      title="Drag to resize column"
                    />
                  </th>
                )}
                {visibleColumns.device_type && (
                  <th
                    style={{ width: `${colWidths.device_type || 140}px`, minWidth: `${colWidths.device_type || 140}px` }}
                    className="p-3 border-r border-border/40 relative group/th"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <Laptop className="size-3 text-muted-foreground/60 shrink-0" />
                      <span className="truncate">device_type</span>
                      <span className="text-[11px] text-muted-foreground/60 lowercase font-normal shrink-0">text</span>
                    </div>
                    <div
                      onMouseDown={(e) => handleColumnResize(e, "device_type")}
                      className="absolute right-0 top-0 bottom-0 w-2.5 cursor-col-resize hover:bg-primary/50 active:bg-primary z-20 opacity-0 group-hover/th:opacity-100 transition-opacity"
                      title="Drag to resize column"
                    />
                  </th>
                )}
                {visibleColumns.timestamp && (
                  <th
                    style={{ width: `${colWidths.timestamp || 190}px`, minWidth: `${colWidths.timestamp || 190}px` }}
                    className="p-3 border-r border-border/40 relative group/th"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <Clock className="size-3 text-muted-foreground/60 shrink-0" />
                      <span className="truncate">timestamp</span>
                      <span className="text-[11px] text-muted-foreground/60 lowercase font-normal shrink-0">timestamptz</span>
                    </div>
                    <div
                      onMouseDown={(e) => handleColumnResize(e, "timestamp")}
                      className="absolute right-0 top-0 bottom-0 w-2.5 cursor-col-resize hover:bg-primary/50 active:bg-primary z-20 opacity-0 group-hover/th:opacity-100 transition-opacity"
                      title="Drag to resize column"
                    />
                  </th>
                )}
                {visibleColumns.type && (
                  <th
                    style={{ width: `${colWidths.type || 170}px`, minWidth: `${colWidths.type || 170}px` }}
                    className="p-3 border-r border-border/40 relative group/th"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <Link2 className="size-3 text-muted-foreground/60 shrink-0" />
                      <span className="truncate">type</span>
                      <span className="text-[11px] text-muted-foreground/60 lowercase font-normal shrink-0">int2</span>
                    </div>
                    <div
                      onMouseDown={(e) => handleColumnResize(e, "type")}
                      className="absolute right-0 top-0 bottom-0 w-2.5 cursor-col-resize hover:bg-primary/50 active:bg-primary z-20 opacity-0 group-hover/th:opacity-100 transition-opacity"
                      title="Drag to resize column"
                    />
                  </th>
                )}
                {visibleColumns.details && (
                  <th
                    style={{ width: `${colWidths.details || 380}px`, minWidth: `${colWidths.details || 380}px` }}
                    className="p-3 relative group/th"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <Braces className="size-3 text-muted-foreground/60 shrink-0" />
                      <span className="truncate">details</span>
                      <span className="text-[11px] text-muted-foreground/60 lowercase font-normal shrink-0">jsonb</span>
                    </div>
                    <div
                      onMouseDown={(e) => handleColumnResize(e, "details")}
                      className="absolute right-0 top-0 bottom-0 w-2.5 cursor-col-resize hover:bg-primary/50 active:bg-primary z-20 opacity-0 group-hover/th:opacity-100 transition-opacity"
                      title="Drag to resize column"
                    />
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
                  const detailsJsonStr = JSON.stringify(evt.details || {})

                  return (
                    <tr
                      key={evt.id}
                      className={`transition-colors border-b border-border/40 ${
                        selectedEvent?.id === evt.id ? "bg-muted/20" : ""
                      }`}
                    >
                      {visibleColumns.device_id && (
                        <td
                          style={{ maxWidth: `${colWidths.device_id || 160}px` }}
                          className="p-3 font-medium text-foreground border-r border-border/40"
                          title={evt.device_id}
                        >
                          <div className="flex items-center justify-between gap-2 group/cell min-w-0">
                            <span className="font-mono truncate">{evt.device_id}</span>
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
                        <td
                          style={{ maxWidth: `${colWidths.hostname || 160}px` }}
                          className="p-3 font-medium text-foreground border-r border-border/40"
                          title={hostnameVal}
                        >
                          <div className="flex items-center justify-between gap-2 group/cell min-w-0">
                            <span className="font-mono text-muted-foreground truncate">{hostnameVal}</span>
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
                        <td
                          style={{ maxWidth: `${colWidths.device || 140}px` }}
                          className="p-3 font-medium text-foreground border-r border-border/40"
                          title={deviceVal}
                        >
                          <div className="flex items-center justify-between gap-2 group/cell min-w-0">
                            <span className="font-mono text-muted-foreground truncate">{deviceVal}</span>
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
                        <td
                          style={{ maxWidth: `${colWidths.device_type || 140}px` }}
                          className="p-3 font-medium text-foreground border-r border-border/40"
                          title={deviceTypeVal}
                        >
                          <div className="flex items-center justify-between gap-2 group/cell min-w-0">
                            <span className="font-mono text-muted-foreground truncate">{deviceTypeVal}</span>
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
                        <td
                          style={{ maxWidth: `${colWidths.timestamp || 190}px` }}
                          className="p-3 text-muted-foreground font-mono border-r border-border/40 truncate"
                          title={timestampStr}
                        >
                          {timestampStr}
                        </td>
                      )}
                      {visibleColumns.type && (
                        <td
                          style={{ maxWidth: `${colWidths.type || 170}px` }}
                          className="p-3 font-medium text-foreground border-r border-border/40 truncate"
                          title={`${getEventTypeName(evt.type)} - ${eventTypes.find(t => t.id === evt.type)?.description || ""}`}
                        >
                          <span className="bg-muted px-2.5 py-1 rounded-md text-xs font-mono border border-border inline-block truncate max-w-full">
                            {getEventTypeName(evt.type)}
                          </span>
                        </td>
                      )}
                      {visibleColumns.details && (
                        <td
                          style={{ maxWidth: `${colWidths.details || 380}px` }}
                          onClick={() => {
                            setSelectedEvent(evt)
                            setActiveDetailTab("overview")
                          }}
                          className="p-3 font-medium text-foreground truncate cursor-pointer hover:bg-primary/5 transition-colors"
                          title={`Click to view details JSON:\n${detailsJsonStr}`}
                        >
                          <div className="truncate">
                            {renderFormattedDetailsCell(getDynamicDetails(evt))}
                          </div>
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
                  {/* Top Event Metadata Banner */}
                  <div className="p-3 border border-border rounded-lg bg-muted/10 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="bg-muted px-2 py-0.5 rounded text-[11px] font-mono border border-border font-medium text-foreground">
                        {getEventTypeName(selectedEvent.type)}
                      </span>
                      <span className="text-[11px] font-mono text-muted-foreground">
                        {formatDateString(selectedEvent.timestamp, selectedTimezone)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-border/40">
                      <span className="text-muted-foreground font-mono">Event ID:</span>
                      <span className="font-mono text-[11px] text-foreground font-semibold select-all">
                        {selectedEvent.id}
                      </span>
                    </div>
                  </div>

                  {/* 1. DEVICE CONTEXT SECTION */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 border-b border-border pb-2">
                      <Laptop className="size-4 text-primary" />
                      <h3 className="text-xs font-bold text-foreground uppercase tracking-wider font-mono">
                        Device Context
                      </h3>
                    </div>
                    <div className="space-y-2.5 text-xs">
                      <div className="flex justify-between items-center border-b border-border/30 pb-2">
                        <span className="text-muted-foreground">Device ID</span>
                        <span className="font-mono font-medium text-foreground">
                          {selectedEvent.details.device_context?.device_id || selectedEvent.device_id || "-"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center border-b border-border/30 pb-2">
                        <span className="text-muted-foreground">Device Type</span>
                        <span className="font-medium text-foreground">
                          {selectedEvent.details.device_context?.device_type || "-"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center border-b border-border/30 pb-2">
                        <span className="text-muted-foreground">Hostname</span>
                        <span className="font-mono font-medium text-foreground">
                          {selectedEvent.details.device_context?.hostname || "-"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center border-b border-border/30 pb-2">
                        <span className="text-muted-foreground">OS / Client</span>
                        <span className="font-medium text-foreground">
                          {selectedEvent.details.device_context?.os || "-"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center border-b border-border/30 pb-2">
                        <span className="text-muted-foreground">IP Address</span>
                        <span className="font-mono text-foreground font-medium flex items-center gap-1">
                          <span>{selectedEvent.details.device_context?.ip_address || "-"}</span>
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
                        </span>
                      </div>
                      <div className="flex justify-between items-center pb-1">
                        <span className="text-muted-foreground">MAC Address</span>
                        <span className="font-mono text-foreground font-medium">
                          {selectedEvent.details.device_context?.mac_address || "-"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 2. CONTENT CONTEXT SECTION */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 border-b border-border pb-2">
                      <Server className="size-4 text-primary" />
                      <h3 className="text-xs font-bold text-foreground uppercase tracking-wider font-mono">
                        Content Context
                      </h3>
                    </div>
                    <div className="space-y-2.5 text-xs">
                      <div className="flex justify-between items-center border-b border-border/30 pb-2">
                        <span className="text-muted-foreground">Content Title</span>
                        <span className="font-medium text-foreground truncate max-w-[260px] text-right" title={selectedEvent.details.content?.title}>
                          {selectedEvent.details.content?.title || "-"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center border-b border-border/30 pb-2">
                        <span className="text-muted-foreground">Platform</span>
                        <span className="font-medium text-foreground">
                          {selectedEvent.details.content?.platform || "-"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center border-b border-border/30 pb-2">
                        <span className="text-muted-foreground">Content Type</span>
                        <span className="font-medium text-foreground">
                          {selectedEvent.details.content?.content_type || "-"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center border-b border-border/30 pb-2">
                        <span className="text-muted-foreground">Genre</span>
                        <span className="font-medium text-foreground">
                          {selectedEvent.details.content?.genre || "-"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center border-b border-border/30 pb-2">
                        <span className="text-muted-foreground">Audio Language</span>
                        <span className="font-medium text-foreground">
                          {selectedEvent.details.content?.audio_language || "-"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center border-b border-border/30 pb-2">
                        <span className="text-muted-foreground">Live Stream</span>
                        <span className="font-medium text-foreground">
                          {selectedEvent.details.content?.is_live !== undefined
                            ? (selectedEvent.details.content.is_live ? "Live" : "VOD (On Demand)")
                            : "-"}
                        </span>
                      </div>
                      {selectedEvent.details.content?.duration_seconds ? (
                        <div className="flex justify-between items-center pb-1">
                          <span className="text-muted-foreground">Duration</span>
                          <span className="font-mono text-foreground">
                            {selectedEvent.details.content.duration_seconds}s
                          </span>
                        </div>
                      ) : null}
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
