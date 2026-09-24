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
import {
  DEFAULT_ROUTER_EVENT_TYPES,
  formatRouterDetails,
  getNestedProp,
  RouterEventTypeMeta,
} from "@/lib/router-event-defaults"

export interface RouterEventLog {
  id: string
  device_id: string
  sub_device_id: string | null
  type: number
  timestamp: string | number
  details: any
  created_at: string
}

export interface RouterFilterChip {
  id: string
  field: "device_id" | "sub_device_id" | "mac" | "ip" | "hostname" | "platform" | "domain" | "text"
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

export function RouterEventsClient() {
  const { selectedTimezone } = useTimezoneStore()
  const [events, setEvents] = React.useState<RouterEventLog[]>([])
  const [eventTypes, setEventTypes] = React.useState<RouterEventTypeMeta[]>(DEFAULT_ROUTER_EVENT_TYPES)
  const [distinctDevices, setDistinctDevices] = React.useState<string[]>([])
  const [selectedEvent, setSelectedEvent] = React.useState<RouterEventLog | null>(null)

  // Intelligent Chip-based Search Filters
  const [stagedChips, setStagedChips] = React.useState<RouterFilterChip[]>([])
  const [appliedChips, setAppliedChips] = React.useState<RouterFilterChip[]>([])
  const [stagedSearchField, setStagedSearchField] = React.useState<RouterFilterChip["field"]>("device_id")
  const [stagedSearchTerm, setStagedSearchTerm] = React.useState("")
  const [showSuggestions, setShowSuggestions] = React.useState(false)

  // Quick Dropdown Filters (Staging)
  const [stagedTypeFilter, setStagedTypeFilter] = React.useState<string>("ALL")
  const [stagedDeviceFilter, setStagedDeviceFilter] = React.useState<string>("ALL")
  const [stagedSubDeviceFilter, setStagedSubDeviceFilter] = React.useState<string>("ALL")
  const [stagedDateRange, setStagedDateRange] = React.useState<DateRange | undefined>(undefined)
  const stagedStartDateFilter = stagedDateRange?.from
  const stagedEndDateFilter = stagedDateRange?.to

  // Quick Dropdown Filters (Applied)
  const [appliedTypeFilter, setAppliedTypeFilter] = React.useState<string>("ALL")
  const [appliedDeviceFilter, setAppliedDeviceFilter] = React.useState<string>("ALL")
  const [appliedSubDeviceFilter, setAppliedSubDeviceFilter] = React.useState<string>("ALL")
  const [appliedDateRange, setAppliedDateRange] = React.useState<DateRange | undefined>(undefined)
  const appliedStartDateFilter = appliedDateRange?.from
  const appliedEndDateFilter = appliedDateRange?.to

  // Auto Refresh Interval state (default: 60 sec i.e. 60000 ms)
  const [refreshInterval, setRefreshInterval] = React.useState<number>(60000)

  // Pagination settings
  const [currentPage, setCurrentPage] = React.useState(1)
  const [itemsPerPage, setItemsPerPage] = React.useState(25)

  // Column resizing state
  const [colWidths, setColWidths] = React.useState<Record<string, number>>({
    device_id: 150,
    sub_device_id: 120,
    timestamp: 190,
    type: 180,
    details: 420,
    created_at: 180,
  })

  // Column visibility state
  const [visibleColumns, setVisibleColumns] = React.useState({
    device_id: true,
    sub_device_id: true,
    timestamp: true,
    type: true,
    details: true,
    created_at: true,
  })
  const [showColumnDropdown, setShowColumnDropdown] = React.useState(false)

  // Refresh & Drawer states
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const [activeDetailTab, setActiveDetailTab] = React.useState<"overview" | "raw">("overview")
  const [copiedText, setCopiedText] = React.useState<string | null>(null)

  const supabase = createClient()

  const handleColumnResize = (e: React.MouseEvent, colKey: string) => {
    e.preventDefault()
    e.stopPropagation()
    const startX = e.clientX
    const startWidth = colWidths[colKey] || 150
    document.body.style.userSelect = "none"
    document.body.style.cursor = "col-resize"

    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX
      const newWidth = Math.max(40, startWidth + delta)
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

  const handleAddChip = (fieldParam?: RouterFilterChip["field"], valueParam?: string) => {
    const targetField = fieldParam || stagedSearchField
    const targetValue = (valueParam !== undefined ? valueParam : stagedSearchTerm).trim()
    if (!targetValue) return

    const isDuplicate = stagedChips.some(c => c.field === targetField && c.value.toLowerCase() === targetValue.toLowerCase())
    if (!isDuplicate) {
      const newChip: RouterFilterChip = {
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
    const ids = events.map(e => e.device_id).filter(Boolean)
    return Array.from(new Set([...ids, ...distinctDevices])).sort()
  }, [events, distinctDevices])

  const uniqueSubDeviceIds = React.useMemo(() => {
    const subs = events.map(e => e.sub_device_id).filter((s): s is string => Boolean(s))
    return Array.from(new Set(subs)).sort()
  }, [events])

  const suggestions = React.useMemo(() => {
    const term = stagedSearchTerm.toLowerCase().trim()
    let list: string[] = []

    if (stagedSearchField === "device_id") list = uniqueDeviceIds
    else if (stagedSearchField === "sub_device_id") list = uniqueSubDeviceIds

    const existingValues = new Set(stagedChips.filter(c => c.field === stagedSearchField).map(c => c.value.toLowerCase()))
    const filteredList = list.filter(item => !existingValues.has(item.toLowerCase()))

    if (!term) return filteredList.slice(0, 8)
    return filteredList.filter(item => item.toLowerCase().includes(term)).slice(0, 8)
  }, [stagedSearchField, stagedSearchTerm, uniqueDeviceIds, uniqueSubDeviceIds, stagedChips])

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1)
  }, [appliedChips, appliedTypeFilter, appliedDeviceFilter, appliedSubDeviceFilter, appliedStartDateFilter, appliedEndDateFilter])

  // Fetch router event types & distinct devices & telemetry router events
  const fetchSupabaseData = React.useCallback(async () => {
    try {
      // 1. Fetch router event types
      const typesRes = await supabase.from("router_event_types").select("*").order("type", { ascending: true })
      if (!typesRes.error && typesRes.data && typesRes.data.length > 0) {
        const dbTypesMap = new Map(typesRes.data.map((t: any) => [t.type, t]))
        const merged: RouterEventTypeMeta[] = DEFAULT_ROUTER_EVENT_TYPES.map(def => {
          const dbItem = dbTypesMap.get(def.type)
          return {
            ...def,
            name: dbItem?.name || def.name,
            description: dbItem?.description || def.description,
          }
        })
        setEventTypes(merged)
      }

      // 2. Fetch distinct device_id list from router_events
      const deviceQuery = await supabase.from("router_events").select("device_id")
      if (!deviceQuery.error && deviceQuery.data) {
        const unique = Array.from(new Set(deviceQuery.data.map((d: any) => d.device_id).filter(Boolean))).sort()
        setDistinctDevices(unique as string[])
      }

      // 3. Fetch router_events in chunks
      let eventsData: any[] = []
      let pageIndex = 0
      const pageSize = 1000
      let hasMore = true
      let fetchError = false

      while (hasMore) {
        let query = supabase.from("router_events").select("*")

        if (appliedTypeFilter !== "ALL") {
          query = query.eq("type", parseInt(appliedTypeFilter, 10))
        }
        if (appliedDeviceFilter !== "ALL") {
          query = query.eq("device_id", appliedDeviceFilter)
        }
        if (appliedSubDeviceFilter === "NULL") {
          query = query.is("sub_device_id", null)
        } else if (appliedSubDeviceFilter !== "ALL") {
          query = query.eq("sub_device_id", appliedSubDeviceFilter)
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
          console.error("Error fetching router events chunk:", error)
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
        const formatted: RouterEventLog[] = eventsData.map((d: any) => {
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
            sub_device_id: d.sub_device_id ? String(d.sub_device_id) : null,
            type: typeof d.type === "number" ? d.type : parseInt(d.type || "0", 10),
            timestamp: d.timestamp,
            details: detailsObj,
            created_at: d.created_at || new Date().toISOString(),
          }
        })

        setEvents(formatted)
      } else {
        setEvents([])
      }
    } catch (e) {
      console.error("Failed fetching router events:", e)
      setEvents([])
    }
  }, [supabase, appliedTypeFilter, appliedDeviceFilter, appliedSubDeviceFilter, appliedStartDateFilter, appliedEndDateFilter])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetchSupabaseData()
    setTimeout(() => setIsRefreshing(false), 600)
  }

  React.useEffect(() => {
    fetchSupabaseData()
    if (refreshInterval === 0) return
    const interval = setInterval(fetchSupabaseData, refreshInterval)
    return () => clearInterval(interval)
  }, [fetchSupabaseData, refreshInterval])

  // Filter events locally by active chips
  const filteredEvents = React.useMemo(() => {
    return events.filter(evt => {
      for (const chip of appliedChips) {
        const val = chip.value.toLowerCase().trim()
        if (!val) continue

        if (chip.field === "device_id") {
          if (!(evt.device_id || "").toLowerCase().includes(val)) return false
        } else if (chip.field === "sub_device_id") {
          if (!(evt.sub_device_id || "").toLowerCase().includes(val)) return false
        } else if (chip.field === "mac") {
          const devMac = getNestedProp(evt.details, "device_details.mac") || getNestedProp(evt.details, "mac") || ""
          if (!String(devMac).toLowerCase().includes(val)) return false
        } else if (chip.field === "ip") {
          const devIp = getNestedProp(evt.details, "device_details.ip") || getNestedProp(evt.details, "ip") || getNestedProp(evt.details, "domain_activity.source_ip") || ""
          if (!String(devIp).toLowerCase().includes(val)) return false
        } else if (chip.field === "hostname") {
          const host = getNestedProp(evt.details, "device_details.hostname") || getNestedProp(evt.details, "hostname") || ""
          if (!String(host).toLowerCase().includes(val)) return false
        } else if (chip.field === "platform") {
          const p = getNestedProp(evt.details, "domain_activity.platform") || getNestedProp(evt.details, "session_summary.platform") || getNestedProp(evt.details, "content.platform") || ""
          const pStr = typeof p === "object" ? (p.platform || "") : String(p)
          if (!pStr.toLowerCase().includes(val)) return false
        } else if (chip.field === "domain") {
          const dom = getNestedProp(evt.details, "domain_activity.domain") || getNestedProp(evt.details, "content.ad_domain") || ""
          if (!String(dom).toLowerCase().includes(val)) return false
        } else {
          // text search in entire event object JSON
          const fullMatch =
            (evt.device_id || "").toLowerCase().includes(val) ||
            (evt.sub_device_id || "").toLowerCase().includes(val) ||
            (evt.id || "").toLowerCase().includes(val) ||
            JSON.stringify(evt.details || {}).toLowerCase().includes(val)
          if (!fullMatch) return false
        }
      }
      return true
    })
  }, [events, appliedChips])

  // Pagination calculation
  const paginatedEvents = React.useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredEvents.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredEvents, currentPage, itemsPerPage])

  const totalPages = Math.ceil(filteredEvents.length / itemsPerPage)

  const getCleanTimezoneName = (tz: string) => mapLabelToIana(tz)

  const parseTimestampToUnix = (tsVal: any): number => {
    if (typeof tsVal === "number") {
      return tsVal < 1e11 ? tsVal : Math.floor(tsVal / 1000)
    }
    if (!tsVal) return Math.floor(Date.now() / 1000)
    let str = String(tsVal).trim()
    if (str.includes(" ") && !str.includes("T")) str = str.replace(" ", "T")
    const parsedMs = new Date(str).getTime()
    return isNaN(parsedMs) ? Math.floor(Date.now() / 1000) : Math.floor(parsedMs / 1000)
  }

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedText(text)
    setTimeout(() => setCopiedText(null), 2000)
  }

  const handleApplyFilters = () => {
    let currentChips = [...stagedChips]
    if (stagedSearchTerm.trim()) {
      const pendingVal = stagedSearchTerm.trim()
      const isDuplicate = currentChips.some(c => c.field === stagedSearchField && c.value.toLowerCase() === pendingVal.toLowerCase())
      if (!isDuplicate) {
        const newChip: RouterFilterChip = {
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
    setAppliedDeviceFilter(stagedDeviceFilter)
    setAppliedSubDeviceFilter(stagedSubDeviceFilter)
    setAppliedDateRange(stagedDateRange)
    setShowSuggestions(false)
  }

  const handleClearFilters = () => {
    setStagedChips([])
    setStagedSearchTerm("")
    setStagedSearchField("device_id")
    setStagedTypeFilter("ALL")
    setStagedDeviceFilter("ALL")
    setStagedSubDeviceFilter("ALL")
    setStagedDateRange(undefined)

    setAppliedChips([])
    setAppliedTypeFilter("ALL")
    setAppliedDeviceFilter("ALL")
    setAppliedSubDeviceFilter("ALL")
    setAppliedDateRange(undefined)
    setShowSuggestions(false)
  }

  const toggleColumn = (col: keyof typeof visibleColumns) => {
    setVisibleColumns(prev => ({ ...prev, [col]: !prev[col] }))
  }

  const getEventTypeName = (typeId: number) => {
    const matched = eventTypes.find(t => t.type === typeId)
    return matched ? matched.name : `TYPE_${typeId}`
  }

  const renderDetailsSummaryCell = (evt: RouterEventLog) => {
    const matchedType = eventTypes.find(t => t.type === evt.type)
    const summaryText = formatRouterDetails(evt.details, evt.type, evt.sub_device_id, matchedType?.template, matchedType?.field_rules)

    // Check platform icon if available
    let platformName: string | null = null
    const domPlatform = getNestedProp(evt.details, "domain_activity.platform")
    if (domPlatform) {
      platformName = typeof domPlatform === "object" ? domPlatform.platform : String(domPlatform)
    } else {
      platformName = getNestedProp(evt.details, "session_summary.platform") || getNestedProp(evt.details, "content.platform") || null
    }

    const iconUrl = platformName ? findPlatformIconUrl(platformName) : null

    // Check for platform bracket syntax e.g. [YouTube] title
    const match = summaryText.match(/^\[([^\]]+)\]\s*(.*)$/)
    if (match) {
      const badgeLabel = match[1]
      const restTitle = match[2]
      const pIcon = findPlatformIconUrl(badgeLabel) || iconUrl

      return (
        <div className="flex items-center gap-2 font-medium text-xs sm:text-sm truncate">
          {pIcon ? (
            <img
              src={pIcon}
              alt={badgeLabel}
              className="size-4 rounded object-cover border border-border/80 shrink-0 select-none"
            />
          ) : (
            <span className="bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded text-[11px] font-mono font-semibold uppercase tracking-wider shrink-0 select-none">
              {badgeLabel}
            </span>
          )}
          <span className="text-foreground truncate" title={restTitle || summaryText}>{restTitle || summaryText}</span>
        </div>
      )
    }

    return (
      <div className="flex items-center gap-2 text-xs truncate">
        {iconUrl && (
          <img
            src={iconUrl}
            alt={platformName || "platform"}
            className="size-4 rounded object-cover border border-border/80 shrink-0 select-none"
          />
        )}
        <span className="text-muted-foreground font-mono truncate" title={summaryText}>{summaryText}</span>
      </div>
    )
  }

  return (
    <PageContainer
      title="Router Events Explorer"
      description={
        <span className="flex flex-wrap gap-2 items-center">
          <span>Audit real-time router events (`router_events` & `router_event_types` tables).</span>
          <span className="bg-primary/10 text-primary text-[10px] font-mono font-medium px-2 py-0.5 rounded border border-primary/20 shrink-0">
            Timezone: {getCleanTimezoneName(selectedTimezone)}
          </span>
        </span>
      }
    >
      <div className="flex flex-col border border-border bg-card rounded-lg shadow-2xs overflow-hidden w-full min-w-0">
        {/* Table Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-muted/5 border-b border-border text-xs select-none">
          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input with Field Selector */}
            <div className="relative flex items-center shrink-0">
              <ButtonGroup className="h-8">
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
                    <SelectItem value="device_id">device_id (Router)</SelectItem>
                    <SelectItem value="sub_device_id">sub_device_id (TV Slot)</SelectItem>
                    <SelectItem value="mac">mac address</SelectItem>
                    <SelectItem value="ip">ip address</SelectItem>
                    <SelectItem value="hostname">hostname</SelectItem>
                    <SelectItem value="platform">platform</SelectItem>
                    <SelectItem value="domain">domain</SelectItem>
                    <SelectItem value="text">text</SelectItem>
                  </SelectContent>
                </Select>

                <div className="relative flex items-center">
                  <Input
                    placeholder={`Search ${stagedSearchField}...`}
                    value={stagedSearchTerm}
                    onChange={(e) => {
                      setStagedSearchTerm(e.target.value)
                      setShowSuggestions(true)
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleAddChip()
                      }
                    }}
                    className="h-8 text-xs bg-background border-l-0 rounded-l-none rounded-r-md focus-visible:ring-0 focus-visible:ring-offset-0 w-48 sm:w-60 pr-7"
                  />
                  {stagedSearchTerm && (
                    <button
                      onClick={() => setStagedSearchTerm("")}
                      className="absolute right-2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>
              </ButtonGroup>

              {/* Suggestions Dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute left-0 top-full mt-1 w-64 bg-popover border border-border rounded-md shadow-md z-50 py-1">
                  <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase border-b border-border">
                    Suggestions for {stagedSearchField}
                  </div>
                  {suggestions.map((sug, i) => (
                    <button
                      key={i}
                      onClick={() => handleAddChip(stagedSearchField, sug)}
                      className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted font-mono flex items-center justify-between"
                    >
                      <span className="truncate">{sug}</span>
                      <Plus className="size-3 text-muted-foreground ml-1 shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Filter: Router Device ID */}
            <Select
              value={stagedDeviceFilter}
              onValueChange={(val) => setStagedDeviceFilter(val || "ALL")}
            >
              <SelectTrigger className="h-8 text-xs bg-background hover:bg-muted/30 border-border w-36">
                <Radio className="size-3.5 text-muted-foreground mr-1 shrink-0" />
                <SelectValue placeholder="Router ID" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Routers</SelectItem>
                {distinctDevices.map(devId => (
                  <SelectItem key={devId} value={devId}>{devId}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Quick Filter: Sub Device ID (TV Slot) */}
            <Select
              value={stagedSubDeviceFilter}
              onValueChange={(val) => setStagedSubDeviceFilter(val || "ALL")}
            >
              <SelectTrigger className="h-8 text-xs bg-background hover:bg-muted/30 border-border w-32">
                <Tv className="size-3.5 text-muted-foreground mr-1 shrink-0" />
                <SelectValue placeholder="Sub Device" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Sub Devices</SelectItem>
                <SelectItem value="NULL">Router Main (NULL)</SelectItem>
                <SelectItem value="01">TV Slot 01</SelectItem>
                <SelectItem value="02">TV Slot 02</SelectItem>
              </SelectContent>
            </Select>

            {/* Quick Filter: Event Type */}
            <Select
              value={stagedTypeFilter}
              onValueChange={(val) => setStagedTypeFilter(val || "ALL")}
            >
              <SelectTrigger className="h-8 text-xs bg-background hover:bg-muted/30 border-border w-44">
                <Zap className="size-3.5 text-muted-foreground mr-1 shrink-0" />
                <SelectValue placeholder="Event Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Event Types</SelectItem>
                {eventTypes.map(t => (
                  <SelectItem key={t.type} value={String(t.type)}>
                    TYPE {t.type} {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Date Range Picker */}
            <Popover>
              <PopoverTrigger
                render={
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-8 text-xs font-normal border-border justify-start text-left px-2.5",
                      !stagedDateRange && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-1.5 size-3.5 text-muted-foreground" />
                    {stagedDateRange?.from ? (
                      stagedDateRange.to ? (
                        <>
                          {format(stagedDateRange.from, "LLL dd, y")} -{" "}
                          {format(stagedDateRange.to, "LLL dd, y")}
                        </>
                      ) : (
                        format(stagedDateRange.from, "LLL dd, y")
                      )
                    ) : (
                      <span>Pick Date Range</span>
                    )}
                  </Button>
                }
              />
              <PopoverContent className="w-auto p-0 z-50" align="start">
                <Calendar
                  mode="range"
                  defaultMonth={stagedDateRange?.from}
                  selected={stagedDateRange}
                  onSelect={setStagedDateRange}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>

            {/* Apply & Clear buttons */}
            <Button
              onClick={handleApplyFilters}
              size="sm"
              className="h-8 text-xs px-3 bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
            >
              Apply Filter
            </Button>
            <Button
              onClick={handleClearFilters}
              variant="outline"
              size="sm"
              className="h-8 text-xs px-2.5 text-muted-foreground hover:text-foreground border-border"
            >
              Reset
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {/* Auto Refresh Select */}
            <Select
              value={String(refreshInterval)}
              onValueChange={(val) => setRefreshInterval(Number(val))}
            >
              <SelectTrigger className="h-8 text-xs bg-background border-border w-32">
                <Clock className="size-3.5 text-muted-foreground mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="0">Pause Auto-Refresh</SelectItem>
                <SelectItem value="10000">Every 10s</SelectItem>
                <SelectItem value="30000">Every 30s</SelectItem>
                <SelectItem value="60000">Every 1 min</SelectItem>
                <SelectItem value="300000">Every 5 min</SelectItem>
              </SelectContent>
            </Select>

            {/* Refresh Button */}
            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              className="h-8 size-8 border-border"
              title="Refresh events from Supabase"
            >
              <RefreshCw className={cn("size-3.5", isRefreshing && "animate-spin")} />
            </Button>

            {/* Column Selector Dropdown */}
            <Popover open={showColumnDropdown} onOpenChange={setShowColumnDropdown}>
              <PopoverTrigger
                render={
                  <Button variant="outline" size="sm" className="h-8 text-xs px-2.5 border-border">
                    <Columns3 className="size-3.5 mr-1" />
                    Columns
                  </Button>
                }
              />
              <PopoverContent className="w-48 p-2 text-xs" align="end">
                <div className="font-semibold px-2 py-1 text-muted-foreground uppercase text-[10px]">
                  Visible Columns
                </div>
                <div className="space-y-1">
                  {Object.entries(visibleColumns).map(([key, isVis]) => (
                    <label
                      key={key}
                      onClick={() => toggleColumn(key as any)}
                      className="flex items-center gap-2 px-2 py-1 rounded hover:bg-muted cursor-pointer select-none font-mono"
                    >
                      <input
                        type="checkbox"
                        checked={isVis}
                        onChange={() => {}}
                        className="rounded border-border"
                      />
                      <span>{key}</span>
                    </label>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Filter Chips Display Bar */}
        {appliedChips.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 p-2 px-3 bg-muted/20 border-b border-border text-xs">
            <span className="text-muted-foreground text-[11px] font-medium mr-1">Active Filters:</span>
            {appliedChips.map(chip => (
              <span
                key={chip.id}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded font-mono text-xs"
              >
                <span className="text-muted-foreground">{chip.field}:</span>
                <span className="font-semibold">{chip.value}</span>
                <button
                  onClick={() => handleRemoveChip(chip.id)}
                  className="hover:text-destructive ml-0.5"
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Data Grid Table */}
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-muted-foreground font-semibold uppercase text-[10px] tracking-wider select-none">
                {visibleColumns.device_id && (
                  <th style={{ width: colWidths.device_id }} className="p-2.5 pl-3 relative group">
                    <div className="flex items-center justify-between">
                      <span>Router ID</span>
                      <div
                        onMouseDown={(e) => handleColumnResize(e, "device_id")}
                        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50 group-hover:bg-border"
                      />
                    </div>
                  </th>
                )}
                {visibleColumns.sub_device_id && (
                  <th style={{ width: colWidths.sub_device_id }} className="p-2.5 relative group">
                    <div className="flex items-center justify-between">
                      <span>Sub Device</span>
                      <div
                        onMouseDown={(e) => handleColumnResize(e, "sub_device_id")}
                        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50 group-hover:bg-border"
                      />
                    </div>
                  </th>
                )}
                {visibleColumns.timestamp && (
                  <th style={{ width: colWidths.timestamp }} className="p-2.5 relative group">
                    <div className="flex items-center justify-between">
                      <span>Timestamp</span>
                      <div
                        onMouseDown={(e) => handleColumnResize(e, "timestamp")}
                        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50 group-hover:bg-border"
                      />
                    </div>
                  </th>
                )}
                {visibleColumns.type && (
                  <th style={{ width: colWidths.type }} className="p-2.5 relative group">
                    <div className="flex items-center justify-between">
                      <span>Event Type</span>
                      <div
                        onMouseDown={(e) => handleColumnResize(e, "type")}
                        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50 group-hover:bg-border"
                      />
                    </div>
                  </th>
                )}
                {visibleColumns.details && (
                  <th style={{ width: colWidths.details }} className="p-2.5 relative group">
                    <div className="flex items-center justify-between">
                      <span>Details Summary</span>
                      <div
                        onMouseDown={(e) => handleColumnResize(e, "details")}
                        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50 group-hover:bg-border"
                      />
                    </div>
                  </th>
                )}
                {visibleColumns.created_at && (
                  <th style={{ width: colWidths.created_at }} className="p-2.5 pr-3 relative group">
                    <div className="flex items-center justify-between">
                      <span>Ingest Time</span>
                      <div
                        onMouseDown={(e) => handleColumnResize(e, "created_at")}
                        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50 group-hover:bg-border"
                      />
                    </div>
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginatedEvents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Radio className="size-8 text-muted-foreground/40 stroke-[1.5]" />
                      <p className="font-medium text-sm">No router events found</p>
                      <p className="text-xs text-muted-foreground">
                        Try adjusting your search criteria, device filter, or date range.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedEvents.map((evt) => {
                  const isSelected = selectedEvent?.id === evt.id
                  const typeName = getEventTypeName(evt.type)

                  return (
                    <tr
                      key={evt.id}
                      onClick={() => setSelectedEvent(evt)}
                      className={cn(
                        "hover:bg-muted/40 cursor-pointer transition-colors font-mono",
                        isSelected && "bg-muted/70 font-semibold"
                      )}
                    >
                      {visibleColumns.device_id && (
                        <td className="p-2.5 pl-3">
                          <span className="font-semibold text-foreground bg-muted/60 px-1.5 py-0.5 rounded border border-border/70">
                            {evt.device_id}
                          </span>
                        </td>
                      )}
                      {visibleColumns.sub_device_id && (
                        <td className="p-2.5">
                          {evt.sub_device_id ? (
                            <span className="bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded text-[11px] font-bold">
                              TV_{evt.sub_device_id}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/50 text-[11px]">-</span>
                          )}
                        </td>
                      )}
                      {visibleColumns.timestamp && (
                        <td className="p-2.5 text-muted-foreground whitespace-nowrap">
                          {formatTimestamp(parseTimestampToUnix(evt.timestamp), selectedTimezone)}
                        </td>
                      )}
                      {visibleColumns.type && (
                        <td className="p-2.5">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium border bg-muted/50 border-border text-foreground">
                            <span className="font-bold text-primary">{evt.type}</span>
                            <span>{typeName}</span>
                          </span>
                        </td>
                      )}
                      {visibleColumns.details && (
                        <td className="p-2.5 truncate">
                          {renderDetailsSummaryCell(evt)}
                        </td>
                      )}
                      {visibleColumns.created_at && (
                        <td className="p-2.5 pr-3 text-muted-foreground/70 whitespace-nowrap text-[11px]">
                          {format(new Date(evt.created_at), "HH:mm:ss MMM dd")}
                        </td>
                      )}
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex flex-wrap items-center justify-between p-3 bg-muted/10 border-t border-border text-xs gap-3 select-none">
          <div className="text-muted-foreground font-mono">
            Showing <span className="font-semibold text-foreground">{filteredEvents.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</span> to{" "}
            <span className="font-semibold text-foreground">{Math.min(currentPage * itemsPerPage, filteredEvents.length)}</span> of{" "}
            <span className="font-semibold text-foreground">{filteredEvents.length}</span> events
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Rows per page:</span>
              <Select
                value={String(itemsPerPage)}
                onValueChange={(val) => {
                  setItemsPerPage(Number(val))
                  setCurrentPage(1)
                }}
              >
                <SelectTrigger className="h-7 text-xs bg-background border-border w-16">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="size-7"
              >
                <ChevronsLeft className="size-3.5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="size-7"
              >
                <ChevronLeft className="size-3.5" />
              </Button>
              <span className="px-2 font-mono text-muted-foreground">
                Page {currentPage} of {totalPages || 1}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage >= totalPages}
                className="size-7"
              >
                <ChevronRight className="size-3.5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage >= totalPages}
                className="size-7"
              >
                <ChevronsRight className="size-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Selected Event Detail Drawer / Modal Panel */}
      {selectedEvent && (
        <div className="fixed inset-y-0 right-0 w-full sm:w-[540px] bg-card border-l border-border shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-200">
          {/* Drawer Header */}
          <div className="flex items-center justify-between p-4 border-b border-border bg-muted/10">
            <div className="flex items-center gap-2">
              <Radio className="size-5 text-primary" />
              <div>
                <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                  <span>Router Event Detail</span>
                  <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded border border-primary/20 font-mono">
                    TYPE {selectedEvent.type} {getEventTypeName(selectedEvent.type)}
                  </span>
                </h3>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">
                  ID: {selectedEvent.id}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedEvent(null)}
              className="size-8 text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </Button>
          </div>

          {/* Drawer Nav Tabs */}
          <div className="flex border-b border-border bg-muted/20 px-4 text-xs font-medium">
            <button
              onClick={() => setActiveDetailTab("overview")}
              className={cn(
                "py-2.5 px-3 border-b-2 font-semibold transition-colors flex items-center gap-1.5",
                activeDetailTab === "overview"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Activity className="size-3.5" />
              Overview
            </button>
            <button
              onClick={() => setActiveDetailTab("raw")}
              className={cn(
                "py-2.5 px-3 border-b-2 font-semibold transition-colors flex items-center gap-1.5",
                activeDetailTab === "raw"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Braces className="size-3.5" />
              Raw JSON
            </button>
          </div>

          {/* Drawer Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {activeDetailTab === "overview" ? (
              <div className="space-y-4 text-xs">
                {/* Meta Grid */}
                <div className="grid grid-cols-2 gap-3 p-3 bg-muted/30 rounded-lg border border-border/80">
                  <div>
                    <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Router ID</span>
                    <p className="font-mono font-bold text-foreground text-sm mt-0.5">{selectedEvent.device_id}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Sub Device Slot</span>
                    <p className="font-mono font-bold text-foreground text-sm mt-0.5">
                      {selectedEvent.sub_device_id ? `TV_${selectedEvent.sub_device_id}` : "Router Main (null)"}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Event Timestamp</span>
                    <p className="font-mono text-foreground mt-0.5">
                      {formatTimestamp(parseTimestampToUnix(selectedEvent.timestamp), selectedTimezone)}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Ingest Time</span>
                    <p className="font-mono text-foreground mt-0.5">
                      {format(new Date(selectedEvent.created_at), "yyyy-MM-dd HH:mm:ss")}
                    </p>
                  </div>
                </div>

                {/* Device Details Block */}
                {selectedEvent.details?.device_details && (
                  <div className="p-3 border border-border rounded-lg bg-card space-y-2">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Laptop className="size-3.5 text-primary" />
                      Device Details
                    </h4>
                    <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                      {Object.entries(selectedEvent.details.device_details).map(([k, v]) => (
                        <div key={k} className="bg-muted/40 p-2 rounded border border-border/60">
                          <span className="text-muted-foreground text-[10px] block font-sans">{k}</span>
                          <span className="font-semibold text-foreground break-all">{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Domain Activity Block */}
                {selectedEvent.details?.domain_activity && (
                  <div className="p-3 border border-border rounded-lg bg-card space-y-2">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Globe className="size-3.5 text-primary" />
                      Domain Activity
                    </h4>
                    <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                      {Object.entries(selectedEvent.details.domain_activity).map(([k, v]) => (
                        <div key={k} className="bg-muted/40 p-2 rounded border border-border/60">
                          <span className="text-muted-foreground text-[10px] block font-sans">{k}</span>
                          <span className="font-semibold text-foreground break-all">
                            {typeof v === "object" ? JSON.stringify(v) : String(v)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Traffic Metrics Block */}
                {selectedEvent.details?.traffic_metrics && (
                  <div className="p-3 border border-border rounded-lg bg-card space-y-2">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Activity className="size-3.5 text-primary" />
                      Traffic Metrics
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-xs">
                      {Object.entries(selectedEvent.details.traffic_metrics).map(([k, v]) => (
                        <div key={k} className="bg-muted/40 p-2 rounded border border-border/60">
                          <span className="text-muted-foreground text-[10px] block font-sans">{k}</span>
                          <span className="font-semibold text-foreground break-all">{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Session Summary / Content Block */}
                {selectedEvent.details?.session_summary && (
                  <div className="p-3 border border-border rounded-lg bg-card space-y-2">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Film className="size-3.5 text-primary" />
                      Session Summary
                    </h4>
                    <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                      {Object.entries(selectedEvent.details.session_summary).map(([k, v]) => (
                        <div key={k} className="bg-muted/40 p-2 rounded border border-border/60">
                          <span className="text-muted-foreground text-[10px] block font-sans">{k}</span>
                          <span className="font-semibold text-foreground break-all">
                            {Array.isArray(v) ? v.join(", ") : String(v)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Content Block (YouTube Content / Ad) */}
                {selectedEvent.details?.content && (
                  <div className="p-3 border border-border rounded-lg bg-card space-y-2">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Film className="size-3.5 text-primary" />
                      Content Details
                    </h4>
                    <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                      {Object.entries(selectedEvent.details.content).map(([k, v]) => (
                        <div key={k} className="bg-muted/40 p-2 rounded border border-border/60">
                          <span className="text-muted-foreground text-[10px] block font-sans">{k}</span>
                          <span className="font-semibold text-foreground break-all">{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Full Event Payload
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopyText(JSON.stringify(selectedEvent.details, null, 2))}
                    className="h-7 text-xs gap-1.5"
                  >
                    {copiedText === JSON.stringify(selectedEvent.details, null, 2) ? (
                      <>
                        <Check className="size-3 text-green-500" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="size-3" />
                        Copy JSON
                      </>
                    )}
                  </Button>
                </div>
                <pre className="p-3 bg-muted/60 border border-border rounded-lg text-xs font-mono overflow-x-auto whitespace-pre-wrap text-foreground">
                  {JSON.stringify(
                    {
                      id: selectedEvent.id,
                      device_id: selectedEvent.device_id,
                      sub_device_id: selectedEvent.sub_device_id,
                      type: selectedEvent.type,
                      timestamp: selectedEvent.timestamp,
                      details: selectedEvent.details,
                      created_at: selectedEvent.created_at,
                    },
                    null,
                    2
                  )}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </PageContainer>
  )
}
