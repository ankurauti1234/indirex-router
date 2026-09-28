"use client"

import * as React from "react"
import {
  FileSpreadsheet,
  FileText,
  Download,
  Calendar as CalendarIcon,
  RefreshCw,
  Search,
  Filter,
  Check,
  CheckSquare,
  Square,
  X,
  SlidersHorizontal,
  Copy,
  Radio,
  Tv,
  Database,
  Layers,
  Sparkles,
  ArrowDownToLine,
  Columns3,
  Clock,
  ChevronDown,
  Info,
  CheckCircle2,
  AlertCircle,
  Hash,
} from "lucide-react"
import { useTimezoneStore } from "@/lib/use-timezone-store"
import { mapLabelToIana, formatTimestamp } from "@/lib/timezones"
import { PageContainer } from "@/components/page-container"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import type { DateRange } from "react-day-picker"
import {
  ReportSource,
  ExportFormat,
  ColumnPreset,
  ROUTER_EVENT_COLUMNS,
  PLAYBACK_EVENT_COLUMNS,
  ExportColumnDef,
  PLAYBACK_EVENT_TYPE_NAMES,
  generateCsvString,
  generateXlsxBuffer,
  flattenRouterEvent,
  flattenPlaybackEvent,
} from "@/lib/reports-export-helper"
import { DEFAULT_ROUTER_EVENT_TYPES } from "@/lib/router-event-defaults"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

export function ReportsClient() {
  const { selectedTimezone } = useTimezoneStore()
  const supabase = React.useMemo(() => createClient(), [])

  // 1. Core Source Selection
  const [source, setSource] = React.useState<ReportSource>("router_events")

  // 2. Filters State
  const [selectedTypes, setSelectedTypes] = React.useState<number[]>([]) // empty = ALL
  const [deviceId, setDeviceId] = React.useState<string>("ALL")
  const [subDeviceId, setSubDeviceId] = React.useState<string>("ALL")
  const [searchTerm, setSearchTerm] = React.useState<string>("")
  const [rowLimit, setRowLimit] = React.useState<number>(0) // 0 = all records

  // Date range and presets
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(undefined)
  const [startTime, setStartTime] = React.useState<string>("00:00")
  const [endTime, setEndTime] = React.useState<string>("23:59")
  const [activeDatePreset, setActiveDatePreset] = React.useState<string>("all")

  // 3. Output Format and Columns
  const [exportFormat, setExportFormat] = React.useState<ExportFormat>("xlsx")
  const [columnPreset, setColumnPreset] = React.useState<ColumnPreset>("flattened")
  const [selectedColumnKeys, setSelectedColumnKeys] = React.useState<string[]>([])
  const [formatTimestamps, setFormatTimestamps] = React.useState<boolean>(true)

  // 4. Data states
  const [eventTypesList, setEventTypesList] = React.useState<any[]>([])
  const [distinctDevices, setDistinctDevices] = React.useState<string[]>([])
  const [totalCount, setTotalCount] = React.useState<number | null>(null)
  const [sampleRows, setSampleRows] = React.useState<any[]>([])
  const [isLoadingPreview, setIsLoadingPreview] = React.useState<boolean>(false)

  // 5. Export state
  const [isExporting, setIsExporting] = React.useState<boolean>(false)
  const [exportProgress, setExportProgress] = React.useState<{ percent: number; message: string } | null>(null)
  const [copied, setCopied] = React.useState<boolean>(false)
  const [exportSuccessMessage, setExportSuccessMessage] = React.useState<string | null>(null)
  const [showColumnDialog, setShowColumnDialog] = React.useState<boolean>(false)
  const [typeSearchTerm, setTypeSearchTerm] = React.useState<string>("")

  // Available column definitions for the active source
  const availableColumns: ExportColumnDef[] = React.useMemo(() => {
    return source === "router_events" ? ROUTER_EVENT_COLUMNS : PLAYBACK_EVENT_COLUMNS
  }, [source])

  // Sync default column keys when source changes
  React.useEffect(() => {
    const defaults = availableColumns.filter((c) => c.defaultSelected).map((c) => c.key)
    setSelectedColumnKeys(defaults)
    setColumnPreset("flattened")
  }, [source, availableColumns])

  // Compute actual start and end ISO strings from dateRange and time pickers
  const { startIso, endIso } = React.useMemo(() => {
    if (!dateRange?.from) return { startIso: undefined, endIso: undefined }

    const s = new Date(dateRange.from)
    const [sH, sM] = startTime.split(":").map(Number)
    s.setHours(isNaN(sH) ? 0 : sH, isNaN(sM) ? 0 : sM, 0, 0)

    let e: Date
    if (dateRange.to) {
      e = new Date(dateRange.to)
    } else {
      e = new Date(dateRange.from)
    }
    const [eH, eM] = endTime.split(":").map(Number)
    e.setHours(isNaN(eH) ? 23 : eH, isNaN(eM) ? 59 : eM, 59, 999)

    return {
      startIso: s.toISOString(),
      endIso: e.toISOString(),
    }
  }, [dateRange, startTime, endTime])

  // Quick Date Preset Handler
  const applyDatePreset = (preset: string) => {
    setActiveDatePreset(preset)
    const now = new Date()

    if (preset === "all") {
      setDateRange(undefined)
      setStartTime("00:00")
      setEndTime("23:59")
      return
    }

    if (preset === "today") {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      setDateRange({ from: today, to: today })
      setStartTime("00:00")
      setEndTime("23:59")
      return
    }

    if (preset === "yesterday") {
      const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
      setDateRange({ from: yesterday, to: yesterday })
      setStartTime("00:00")
      setEndTime("23:59")
      return
    }

    if (preset === "24h") {
      const past24 = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      setDateRange({ from: past24, to: now })
      setStartTime(
        `${String(past24.getHours()).padStart(2, "0")}:${String(past24.getMinutes()).padStart(2, "0")}`
      )
      setEndTime(`${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`)
      return
    }

    if (preset === "7d") {
      const past7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      setDateRange({ from: past7, to: now })
      setStartTime("00:00")
      setEndTime("23:59")
      return
    }

    if (preset === "30d") {
      const past30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      setDateRange({ from: past30, to: now })
      setStartTime("00:00")
      setEndTime("23:59")
      return
    }

    if (preset === "month") {
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      setDateRange({ from: firstOfMonth, to: now })
      setStartTime("00:00")
      setEndTime("23:59")
      return
    }
  }

  // Fetch Preview & Metadata from API or Supabase
  const loadPreviewData = React.useCallback(async () => {
    setIsLoadingPreview(true)
    try {
      const params = new URLSearchParams()
      params.set("source", source)
      params.set("format", "preview")
      params.set("timezone", selectedTimezone)
      params.set("formatTimestamps", String(formatTimestamps))

      if (selectedTypes.length > 0) {
        params.set("types", selectedTypes.join(","))
      }
      if (deviceId !== "ALL") {
        params.set("device_id", deviceId)
      }
      if (source === "router_events" && subDeviceId !== "ALL") {
        params.set("sub_device_id", subDeviceId)
      }
      if (startIso) {
        params.set("startDate", startIso)
      }
      if (endIso) {
        params.set("endDate", endIso)
      }
      if (searchTerm.trim()) {
        params.set("search", searchTerm.trim())
      }

      const res = await fetch(`/api/reports/export?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setTotalCount(data.totalCount ?? 0)
        setSampleRows(data.sampleRows || [])
        if (data.eventTypes && Array.isArray(data.eventTypes)) {
          setEventTypesList(data.eventTypes)
        }
        if (data.distinctDevices && Array.isArray(data.distinctDevices)) {
          setDistinctDevices(data.distinctDevices)
        }
      } else {
        // Fallback query directly via Supabase client
        await fallbackClientPreview()
      }
    } catch (err) {
      console.warn("API route preview error, attempting client fallback:", err)
      await fallbackClientPreview()
    } finally {
      setIsLoadingPreview(false)
    }
  }, [source, selectedTypes, deviceId, subDeviceId, startIso, endIso, searchTerm, selectedTimezone, formatTimestamps])

  // Direct client fallback for count and preview if API is busy
  const fallbackClientPreview = async () => {
    try {
      const table = source === "router_events" ? "router_events" : "playback_events"
      let countQ = supabase.from(table).select("*", { count: "exact", head: true })
      let sampleQ = supabase.from(table).select("*").order("timestamp", { ascending: false }).limit(10)

      if (selectedTypes.length > 0) {
        countQ = countQ.in("type", selectedTypes)
        sampleQ = sampleQ.in("type", selectedTypes)
      }
      if (deviceId !== "ALL") {
        countQ = countQ.eq("device_id", deviceId)
        sampleQ = sampleQ.eq("device_id", deviceId)
      }
      if (source === "router_events") {
        if (subDeviceId === "NULL") {
          countQ = countQ.is("sub_device_id", null)
          sampleQ = sampleQ.is("sub_device_id", null)
        } else if (subDeviceId !== "ALL") {
          countQ = countQ.eq("sub_device_id", subDeviceId)
          sampleQ = sampleQ.eq("sub_device_id", subDeviceId)
        }
      }
      if (startIso) {
        countQ = countQ.gte("timestamp", startIso)
        sampleQ = sampleQ.gte("timestamp", startIso)
      }
      if (endIso) {
        countQ = countQ.lte("timestamp", endIso)
        sampleQ = sampleQ.lte("timestamp", endIso)
      }

      const [{ count }, { data: sampleData }] = await Promise.all([countQ, sampleQ])
      setTotalCount(count ?? 0)

      if (sampleData) {
        const typeMap = new Map<number, string>(eventTypesList.map((t) => [t.type, t.name]))
        const flattened = sampleData.map((row) =>
          source === "router_events"
            ? flattenRouterEvent(row, { timezone: selectedTimezone, formatTimestamps, typeNamesMap: typeMap })
            : flattenPlaybackEvent(row, { timezone: selectedTimezone, formatTimestamps, typeNamesMap: typeMap })
        )
        setSampleRows(flattened)
      }
    } catch (e) {
      console.error("Client fallback preview error:", e)
    }
  }

  // Load preview whenever filters or source change
  React.useEffect(() => {
    loadPreviewData()
  }, [loadPreviewData])

  // Reset types selection when changing source
  const handleSourceChange = (newSource: ReportSource) => {
    if (newSource === source) return
    setSource(newSource)
    setSelectedTypes([])
    setDeviceId("ALL")
    setSubDeviceId("ALL")
    setTotalCount(null)
    setSampleRows([])
  }

  // Multi-type selection handlers
  const toggleType = (typeId: number) => {
    setSelectedTypes((prev) => {
      if (prev.includes(typeId)) {
        return prev.filter((id) => id !== typeId)
      } else {
        return [...prev, typeId].sort((a, b) => a - b)
      }
    })
  }

  const selectAllTypes = () => {
    const all = eventTypesList.map((t) => t.type)
    setSelectedTypes(all)
  }

  const clearAllTypes = () => {
    setSelectedTypes([])
  }

  // Column Presets handler
  const handleColumnPresetChange = (preset: ColumnPreset) => {
    setColumnPreset(preset)
    if (preset === "flattened") {
      const defaults = availableColumns.filter((c) => c.defaultSelected).map((c) => c.key)
      setSelectedColumnKeys(defaults)
    } else if (preset === "extended") {
      const allExceptRaw = availableColumns.filter((c) => c.key !== "raw_details").map((c) => c.key)
      setSelectedColumnKeys(allExceptRaw)
    } else if (preset === "raw") {
      const coreAndRaw = availableColumns.filter((c) => c.category === "core" || c.key === "raw_details").map((c) => c.key)
      setSelectedColumnKeys(coreAndRaw)
    } else if (preset === "custom") {
      setShowColumnDialog(true)
    }
  }

  // Toggle individual column key
  const toggleColumnKey = (key: string) => {
    setSelectedColumnKeys((prev) => {
      if (prev.includes(key)) {
        if (prev.length === 1) return prev // keep at least 1 column
        return prev.filter((k) => k !== key)
      } else {
        return [...prev, key]
      }
    })
    setColumnPreset("custom")
  }

  // Execute Export
  const handleExport = async () => {
    setIsExporting(true)
    setExportSuccessMessage(null)
    setExportProgress({ percent: 10, message: "Connecting to Supabase backend..." })

    try {
      const timestampIso = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)
      const baseFilename = `${source}_report_${timestampIso}`

      setExportProgress({ percent: 25, message: "Requesting report compilation from server..." })

      const response = await fetch("/api/reports/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source,
          format: exportFormat,
          types: selectedTypes,
          deviceId: deviceId !== "ALL" ? deviceId : undefined,
          subDeviceId: subDeviceId !== "ALL" ? subDeviceId : undefined,
          startDate: startIso,
          endDate: endIso,
          search: searchTerm.trim() || undefined,
          limit: rowLimit,
          timezone: selectedTimezone,
          formatTimestamps,
          selectedColumns: selectedColumnKeys,
        }),
      })

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}))
        throw new Error(errJson.error || `Export request failed: ${response.statusText}`)
      }

      setExportProgress({ percent: 75, message: "Finalizing file and triggering download..." })

      if (exportFormat === "json") {
        const jsonData = await response.json()
        const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: "application/json" })
        downloadBlob(blob, `${baseFilename}.json`)
      } else {
        const blob = await response.blob()
        const filename = `${baseFilename}.${exportFormat}`
        downloadBlob(blob, filename)
      }

      setExportProgress({ percent: 100, message: "Download ready!" })
      setExportSuccessMessage(`Export complete! Successfully downloaded ${totalCount !== null ? `${totalCount} records` : "report"}.`)
      setTimeout(() => {
        setIsExporting(false)
        setExportProgress(null)
      }, 1500)
    } catch (err: any) {
      console.error("Export error, running client-side fallback chunked download:", err)
      await runClientFallbackExport()
    }
  }

  // Client-side fallback chunked export for extra resilience
  const runClientFallbackExport = async () => {
    try {
      setExportProgress({ percent: 20, message: "Querying Supabase database directly..." })
      const table = source === "router_events" ? "router_events" : "playback_events"
      const maxRows = rowLimit > 0 ? rowLimit : 50000
      const pageSize = 1000
      let fetched: any[] = []
      let pageIndex = 0
      let hasMore = true

      while (hasMore && fetched.length < maxRows) {
        const rangeStart = pageIndex * pageSize
        const remaining = maxRows - fetched.length
        const fetchSize = Math.min(pageSize, remaining)
        const rangeEnd = rangeStart + fetchSize - 1

        let q = supabase.from(table).select("*")
        if (selectedTypes.length > 0) q = q.in("type", selectedTypes)
        if (deviceId !== "ALL") q = q.eq("device_id", deviceId)
        if (source === "router_events") {
          if (subDeviceId === "NULL") q = q.is("sub_device_id", null)
          else if (subDeviceId !== "ALL") q = q.eq("sub_device_id", subDeviceId)
        }
        if (startIso) q = q.gte("timestamp", startIso)
        if (endIso) q = q.lte("timestamp", endIso)

        const { data, error } = await q.order("timestamp", { ascending: false }).range(rangeStart, rangeEnd)
        if (error) throw error

        if (data && data.length > 0) {
          fetched.push(...data)
          const pct = Math.min(85, Math.round(20 + (fetched.length / (totalCount || maxRows)) * 60))
          setExportProgress({
            percent: pct,
            message: `Fetched ${fetched.length.toLocaleString()} rows from Supabase...`,
          })

          if (data.length < fetchSize) hasMore = false
          else pageIndex++
        } else {
          hasMore = false
        }
      }

      if (searchTerm.trim()) {
        const s = searchTerm.toLowerCase().trim()
        fetched = fetched.filter((r) => {
          const dev = String(r.device_id || "").toLowerCase()
          const detailsStr = typeof r.details === "object" ? JSON.stringify(r.details).toLowerCase() : String(r.details || "").toLowerCase()
          return dev.includes(s) || detailsStr.includes(s)
        })
      }

      setExportProgress({ percent: 90, message: `Formatting ${fetched.length} records...` })

      const typeMap = new Map<number, string>(eventTypesList.map((t) => [t.type, t.name]))
      const flattened = fetched.map((row) =>
        source === "router_events"
          ? flattenRouterEvent(row, { timezone: selectedTimezone, formatTimestamps, typeNamesMap: typeMap })
          : flattenPlaybackEvent(row, { timezone: selectedTimezone, formatTimestamps, typeNamesMap: typeMap })
      )

      const timestampIso = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)
      const baseFilename = `${source}_report_${timestampIso}`

      if (exportFormat === "xlsx") {
        const sheetTitle = source === "router_events" ? "Router Events" : "Playback Events"
        const buffer = generateXlsxBuffer(flattened, availableColumns, sheetTitle, selectedColumnKeys)
        const blob = new Blob([buffer as any], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        })
        downloadBlob(blob, `${baseFilename}.xlsx`)
      } else if (exportFormat === "json") {
        const blob = new Blob([JSON.stringify(flattened, null, 2)], { type: "application/json" })
        downloadBlob(blob, `${baseFilename}.json`)
      } else {
        const csv = generateCsvString(flattened, availableColumns, selectedColumnKeys)
        const blob = new Blob([csv], { type: "text/csv; charset=utf-8" })
        downloadBlob(blob, `${baseFilename}.csv`)
      }

      setExportProgress({ percent: 100, message: "Download complete!" })
      setExportSuccessMessage(`Downloaded ${flattened.length.toLocaleString()} records via client fallback.`)
      setTimeout(() => {
        setIsExporting(false)
        setExportProgress(null)
      }, 1500)
    } catch (e: any) {
      console.error("Direct fallback failed:", e)
      setIsExporting(false)
      setExportProgress(null)
      alert(`Export failed: ${e.message || "Unknown error"}`)
    }
  }

  // Copy sample preview to clipboard as CSV
  const handleCopyCsvPreview = () => {
    if (sampleRows.length === 0) return
    const csv = generateCsvString(sampleRows, availableColumns, selectedColumnKeys)
    navigator.clipboard.writeText(csv)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Helper to trigger browser download
  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Filtered types in multi-select popover
  const filteredEventTypes = React.useMemo(() => {
    if (!typeSearchTerm.trim()) return eventTypesList
    const term = typeSearchTerm.toLowerCase().trim()
    return eventTypesList.filter(
      (t) =>
        t.name.toLowerCase().includes(term) ||
        String(t.type).includes(term) ||
        (t.description && t.description.toLowerCase().includes(term))
    )
  }, [eventTypesList, typeSearchTerm])

  // Count active filters
  const activeFiltersCount = React.useMemo(() => {
    let count = 0
    if (selectedTypes.length > 0) count++
    if (deviceId !== "ALL") count++
    if (source === "router_events" && subDeviceId !== "ALL") count++
    if (dateRange?.from) count++
    if (searchTerm.trim()) count++
    if (rowLimit > 0) count++
    return count
  }, [selectedTypes, deviceId, subDeviceId, source, dateRange, searchTerm, rowLimit])

  // Reset all filters
  const handleResetFilters = () => {
    setSelectedTypes([])
    setDeviceId("ALL")
    setSubDeviceId("ALL")
    setDateRange(undefined)
    setActiveDatePreset("all")
    setStartTime("00:00")
    setEndTime("23:59")
    setSearchTerm("")
    setRowLimit(0)
  }

  // Columns to show in preview table
  const previewColumns = React.useMemo(() => {
    return availableColumns.filter((c) => selectedColumnKeys.includes(c.key))
  }, [availableColumns, selectedColumnKeys])

  return (
    <PageContainer
      title="Reports & Data Export"
      description={
        <span className="flex flex-wrap gap-2 items-center">
          <span>Configure filters, customize output columns, and export audit-ready datasets in CSV or Excel (.xlsx) from Supabase.</span>
          <span className="bg-primary/10 text-primary text-[10px] font-mono font-medium px-2 py-0.5 rounded border border-primary/20 shrink-0">
            Timezone: {mapLabelToIana(selectedTimezone)}
          </span>
        </span>
      }
    >
      <div className="flex flex-col gap-6 w-full min-w-0">

        {/* 1. DATA SOURCE SELECTION CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Router Events Card */}
          <div
            onClick={() => handleSourceChange("router_events")}
            className={cn(
              "relative flex flex-col p-4 rounded-xl border transition-all cursor-pointer select-none",
              source === "router_events"
                ? "bg-primary/5 border-primary shadow-xs ring-1 ring-primary/30"
                : "bg-card border-border hover:border-border/80 hover:bg-muted/10 text-muted-foreground"
            )}
          >
            <div className="flex items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-2.5">
                <div
                  className={cn(
                    "p-2 rounded-lg shrink-0",
                    source === "router_events"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  <Radio className="size-4.5" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
                    Router Events
                    <span className="text-[11px] font-mono px-1.5 py-0.2 rounded bg-muted text-muted-foreground font-normal">
                      router_events
                    </span>
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Wi-Fi connects, DNS domain activities, consumer bandwidth & sessions
                  </p>
                </div>
              </div>
              <div className="flex items-center">
                {source === "router_events" ? (
                  <div className="size-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                    <Check className="size-3 stroke-[3]" />
                  </div>
                ) : (
                  <div className="size-5 rounded-full border border-border shrink-0" />
                )}
              </div>
            </div>

            <div className="mt-2 pt-2 border-t border-border/50 flex items-center justify-between text-xs font-mono">
              <span className="text-muted-foreground">Event Types: 11 categories</span>
              <span className="text-primary font-semibold">16,500+ records</span>
            </div>
          </div>

          {/* Events Explorer / Playback Events Card */}
          <div
            onClick={() => handleSourceChange("playback_events")}
            className={cn(
              "relative flex flex-col p-4 rounded-xl border transition-all cursor-pointer select-none",
              source === "playback_events"
                ? "bg-primary/5 border-primary shadow-xs ring-1 ring-primary/30"
                : "bg-card border-border hover:border-border/80 hover:bg-muted/10 text-muted-foreground"
            )}
          >
            <div className="flex items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-2.5">
                <div
                  className={cn(
                    "p-2 rounded-lg shrink-0",
                    source === "playback_events"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  <Database className="size-4.5" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
                    Events Explorer
                    <span className="text-[11px] font-mono px-1.5 py-0.2 rounded bg-muted text-muted-foreground font-normal">
                      playback_events
                    </span>
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Media streaming telemetry, play/pause/heartbeat triggers & audience reach
                  </p>
                </div>
              </div>
              <div className="flex items-center">
                {source === "playback_events" ? (
                  <div className="size-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                    <Check className="size-3 stroke-[3]" />
                  </div>
                ) : (
                  <div className="size-5 rounded-full border border-border shrink-0" />
                )}
              </div>
            </div>

            <div className="mt-2 pt-2 border-t border-border/50 flex items-center justify-between text-xs font-mono">
              <span className="text-muted-foreground">Event Types: 6 telemetry triggers</span>
              <span className="text-primary font-semibold">Audience telemetry</span>
            </div>
          </div>
        </div>

        {/* 2. FILTER & CONFIGURATION PANEL */}
        <div className="flex flex-col border border-border bg-card rounded-xl shadow-2xs overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-muted/20 border-b border-border text-xs">
            <div className="flex items-center gap-2 font-medium text-foreground">
              <Filter className="size-4 text-primary" />
              <span>Report Filters & Export Scope</span>
              {activeFiltersCount > 0 && (
                <span className="bg-primary/15 text-primary text-[10px] font-semibold px-2 py-0.5 rounded-full border border-primary/20">
                  {activeFiltersCount} active filter{activeFiltersCount > 1 ? "s" : ""}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {activeFiltersCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetFilters}
                  className="h-7 text-xs text-muted-foreground hover:text-foreground hover:bg-muted"
                >
                  <X className="size-3 mr-1" />
                  Clear Filters
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={loadPreviewData}
                disabled={isLoadingPreview}
                className="h-7 text-xs gap-1.5"
              >
                <RefreshCw className={cn("size-3", isLoadingPreview && "animate-spin")} />
                Refresh Count
              </Button>
            </div>
          </div>

          <div className="p-4 flex flex-col gap-4">
            {/* Filter Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

              {/* 1. Multiple Event Types Filter */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-foreground flex items-center justify-between">
                  <span>Event Types</span>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {selectedTypes.length === 0
                      ? `All (${eventTypesList.length})`
                      : `${selectedTypes.length} of ${eventTypesList.length} selected`}
                  </span>
                </label>

                <Popover>
                  <PopoverTrigger
                    render={
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 w-full justify-between text-xs font-normal bg-background hover:bg-muted/30"
                      >
                        <span className="truncate">
                          {selectedTypes.length === 0 ? (
                            <span className="text-muted-foreground font-normal">All Event Types</span>
                          ) : selectedTypes.length === 1 ? (
                            <span className="font-medium text-foreground">
                              {eventTypesList.find((t) => t.type === selectedTypes[0])?.name || `Type ${selectedTypes[0]}`}
                            </span>
                          ) : (
                            <span className="font-semibold text-primary">
                              {selectedTypes.length} Types Selected
                            </span>
                          )}
                        </span>
                        <ChevronDown className="size-3.5 opacity-50 shrink-0 ml-1" />
                      </Button>
                    }
                  />
                  <PopoverContent className="w-72 p-2" align="start">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between pb-1 border-b border-border">
                        <span className="text-xs font-semibold text-foreground">Filter Event Types</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={selectAllTypes}
                            className="text-[10px] text-primary hover:underline font-medium"
                          >
                            All
                          </button>
                          <span className="text-muted-foreground text-[10px]">•</span>
                          <button
                            type="button"
                            onClick={clearAllTypes}
                            className="text-[10px] text-muted-foreground hover:underline font-medium"
                          >
                            Clear
                          </button>
                        </div>
                      </div>

                      <Input
                        placeholder="Search event types..."
                        value={typeSearchTerm}
                        onChange={(e) => setTypeSearchTerm(e.target.value)}
                        className="h-7 text-xs"
                      />

                      <div className="max-h-56 overflow-y-auto flex flex-col gap-1 pr-1">
                        {filteredEventTypes.map((et) => {
                          const isChecked = selectedTypes.includes(et.type)
                          return (
                            <div
                              key={et.type}
                              onClick={() => toggleType(et.type)}
                              className={cn(
                                "flex items-start gap-2 p-1.5 rounded cursor-pointer text-xs select-none transition-colors",
                                isChecked ? "bg-primary/10 text-foreground" : "hover:bg-muted text-muted-foreground"
                              )}
                            >
                              <div className="pt-0.5 shrink-0">
                                {isChecked ? (
                                  <CheckSquare className="size-3.5 text-primary" />
                                ) : (
                                  <Square className="size-3.5 text-muted-foreground" />
                                )}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <div className="flex items-center gap-1.5 font-mono text-[11px] font-semibold text-foreground">
                                  <span className="bg-muted px-1 rounded text-[10px] font-mono">{et.type}</span>
                                  <span className="truncate">{et.name}</span>
                                </div>
                                {et.description && (
                                  <span className="text-[10px] text-muted-foreground truncate leading-tight mt-0.5">
                                    {et.description}
                                  </span>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* 2. Device ID Filter */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-foreground">Device ID</label>
                <Select value={deviceId} onValueChange={(val) => setDeviceId(val || "ALL")}>
                  <SelectTrigger className="h-9 text-xs bg-background">
                    <SelectValue placeholder="All Devices" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Devices</SelectItem>
                    {distinctDevices.map((dev) => (
                      <SelectItem key={dev} value={dev} className="font-mono text-xs">
                        {dev}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 3. Sub-Device ID (Router Events) or Scope Limit */}
              {source === "router_events" ? (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-foreground">Sub Device ID</label>
                  <Select value={subDeviceId} onValueChange={(val) => setSubDeviceId(val || "ALL")}>
                    <SelectTrigger className="h-9 text-xs bg-background">
                      <SelectValue placeholder="All Sub Devices" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Sub Devices</SelectItem>
                      <SelectItem value="NULL">Unassigned (Null)</SelectItem>
                      <SelectItem value="SUB_001">SUB_001</SelectItem>
                      <SelectItem value="SUB_002">SUB_002</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-foreground">Household Scope</label>
                  <div className="h-9 px-3 rounded-md border border-border bg-muted/20 flex items-center text-xs text-muted-foreground font-mono">
                    All Household Panels
                  </div>
                </div>
              )}

              {/* 4. Row Limit */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-foreground">Export Limit</label>
                <Select
                  value={String(rowLimit)}
                  onValueChange={(val) => setRowLimit(val ? parseInt(val, 10) : 0)}
                >
                  <SelectTrigger className="h-9 text-xs bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">All Matching Records</SelectItem>
                    <SelectItem value="500">First 500 Records</SelectItem>
                    <SelectItem value="1000">First 1,000 Records</SelectItem>
                    <SelectItem value="5000">First 5,000 Records</SelectItem>
                    <SelectItem value="10000">First 10,000 Records</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Selected Type Badges Row (if any selected) */}
            {selectedTypes.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] text-muted-foreground font-medium mr-1">Types:</span>
                {selectedTypes.map((tid) => {
                  const item = eventTypesList.find((t) => t.type === tid)
                  return (
                    <span
                      key={tid}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 text-xs font-mono font-medium"
                    >
                      <span>#{tid}</span>
                      <span className="font-sans font-semibold text-[11px]">{item?.name || `TYPE_${tid}`}</span>
                      <button
                        type="button"
                        onClick={() => toggleType(tid)}
                        className="hover:bg-primary/20 rounded p-0.5 ml-0.5"
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  )
                })}
                <button
                  type="button"
                  onClick={clearAllTypes}
                  className="text-[11px] text-muted-foreground hover:text-foreground underline ml-1"
                >
                  Clear all
                </button>
              </div>
            )}

            {/* Date Range Picker with Quick Presets */}
            <div className="flex flex-col gap-2 pt-2 border-t border-border/50">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                  <CalendarIcon className="size-3.5 text-primary" />
                  <span>Date & Time Range</span>
                </label>

                {/* Preset Buttons */}
                <div className="flex flex-wrap items-center gap-1">
                  {[
                    { id: "all", label: "All Time" },
                    { id: "today", label: "Today" },
                    { id: "yesterday", label: "Yesterday" },
                    { id: "24h", label: "Last 24h" },
                    { id: "7d", label: "Last 7 Days" },
                    { id: "30d", label: "Last 30 Days" },
                    { id: "month", label: "This Month" },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => applyDatePreset(p.id)}
                      className={cn(
                        "px-2 py-1 rounded text-[11px] font-medium transition-colors",
                        activeDatePreset === p.id
                          ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                          : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/60"
                      )}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Date Range Popover and Time Inputs */}
              <div className="flex flex-wrap items-center gap-2">
                <Popover>
                  <PopoverTrigger
                    render={
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs font-normal gap-2 bg-background justify-start"
                      >
                        <CalendarIcon className="size-3.5 text-muted-foreground" />
                        {dateRange?.from ? (
                          dateRange.to ? (
                            <>
                              {formatTimestamp(dateRange.from, selectedTimezone, { hour: undefined, minute: undefined, second: undefined })}
                              {" - "}
                              {formatTimestamp(dateRange.to, selectedTimezone, { hour: undefined, minute: undefined, second: undefined })}
                            </>
                          ) : (
                            formatTimestamp(dateRange.from, selectedTimezone, { hour: undefined, minute: undefined, second: undefined })
                          )
                        ) : (
                          <span className="text-muted-foreground">Select date range...</span>
                        )}
                      </Button>
                    }
                  />
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="range"
                      defaultMonth={dateRange?.from}
                      selected={dateRange}
                      onSelect={(range) => {
                        setDateRange(range)
                        setActiveDatePreset("custom")
                      }}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>

                {dateRange?.from && (
                  <div className="flex items-center gap-2 bg-muted/30 px-2 py-1 rounded border border-border text-xs">
                    <Clock className="size-3 text-muted-foreground" />
                    <span className="text-muted-foreground text-[11px]">Start:</span>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="bg-transparent border border-border/70 rounded px-1 text-xs font-mono text-foreground focus:outline-none"
                    />
                    <span className="text-muted-foreground text-[11px] ml-1">End:</span>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="bg-transparent border border-border/70 rounded px-1 text-xs font-mono text-foreground focus:outline-none"
                    />
                  </div>
                )}

                {/* Free Text Search */}
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-2.5 top-2 size-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search keywords (IP, MAC, Hostname, Title, Platform)..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-8 pl-8 text-xs bg-background"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm("")}
                      className="absolute right-2.5 top-2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Export Format & Column Configuration Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border">
              {/* Format selection */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-foreground">Export Format:</span>
                <div className="inline-flex rounded-lg border border-border p-0.5 bg-muted/40">
                  <button
                    type="button"
                    onClick={() => setExportFormat("xlsx")}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all",
                      exportFormat === "xlsx"
                        ? "bg-background text-foreground shadow-2xs border border-border/80"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <FileSpreadsheet className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Excel (.xlsx)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setExportFormat("csv")}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all",
                      exportFormat === "csv"
                        ? "bg-background text-foreground shadow-2xs border border-border/80"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <FileText className="size-3.5 text-blue-600 dark:text-blue-400" />
                    <span>CSV (.csv)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setExportFormat("json")}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all",
                      exportFormat === "json"
                        ? "bg-background text-foreground shadow-2xs border border-border/80"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Layers className="size-3.5 text-amber-600 dark:text-amber-400" />
                    <span>JSON (.json)</span>
                  </button>
                </div>
              </div>

              {/* Column Presets & Customizer */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-foreground">Columns:</span>
                <Select
                  value={columnPreset}
                  onValueChange={(val) => handleColumnPresetChange((val as ColumnPreset) || "flattened")}
                >
                  <SelectTrigger className="h-8 text-xs bg-background w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="flattened">Default Flattened</SelectItem>
                    <SelectItem value="extended">Extended (All Data Fields)</SelectItem>
                    <SelectItem value="raw">Core + Raw JSON</SelectItem>
                    <SelectItem value="custom">Custom Columns...</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowColumnDialog(true)}
                  className="h-8 text-xs gap-1.5"
                >
                  <Columns3 className="size-3.5 text-muted-foreground" />
                  <span>Customize ({selectedColumnKeys.length})</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* 3. METRICS & EXPORT ACTION BANNER */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl border border-primary/20 bg-primary/5">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
                {exportFormat === "xlsx" ? (
                  <FileSpreadsheet className="size-5" />
                ) : exportFormat === "csv" ? (
                  <FileText className="size-5" />
                ) : (
                  <Layers className="size-5" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-medium text-muted-foreground">Matching Records:</span>
                  {isLoadingPreview ? (
                    <RefreshCw className="size-3 animate-spin text-primary" />
                  ) : (
                    <span className="text-base font-bold text-foreground font-mono">
                      {totalCount !== null ? totalCount.toLocaleString() : "..."}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                  <span>Source: <strong className="text-foreground">{source === "router_events" ? "Router Events" : "Events Explorer"}</strong></span>
                  <span>•</span>
                  <span>Format: <strong className="text-foreground font-mono uppercase">{exportFormat}</strong></span>
                  <span>•</span>
                  <span>Columns: <strong className="text-foreground">{selectedColumnKeys.length}</strong></span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyCsvPreview}
              disabled={sampleRows.length === 0 || isExporting}
              className="h-9 text-xs gap-1.5 bg-background"
            >
              {copied ? (
                <>
                  <Check className="size-3.5 text-emerald-600" />
                  <span>Copied Preview!</span>
                </>
              ) : (
                <>
                  <Copy className="size-3.5 text-muted-foreground" />
                  <span>Copy Preview CSV</span>
                </>
              )}
            </Button>

            <Button
              size="sm"
              onClick={handleExport}
              disabled={isExporting || (totalCount !== null && totalCount === 0)}
              className="h-9 px-4 text-xs font-semibold gap-2 shadow-sm"
            >
              {isExporting ? (
                <>
                  <RefreshCw className="size-3.5 animate-spin" />
                  <span>Exporting...</span>
                </>
              ) : (
                <>
                  <Download className="size-3.5" />
                  <span>Export Report ({exportFormat.toUpperCase()})</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Export Progress Notification */}
        {exportProgress && (
          <div className="flex flex-col gap-2 p-3 rounded-lg border border-border bg-card shadow-2xs">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-foreground flex items-center gap-2">
                <RefreshCw className="size-3 animate-spin text-primary" />
                {exportProgress.message}
              </span>
              <span className="font-mono text-muted-foreground">{exportProgress.percent}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-primary h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${exportProgress.percent}%` }}
              />
            </div>
          </div>
        )}

        {exportSuccessMessage && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs">
            <CheckCircle2 className="size-4 shrink-0" />
            <span>{exportSuccessMessage}</span>
          </div>
        )}

        {/* 4. LIVE PREVIEW TABLE */}
        <div className="flex flex-col border border-border bg-card rounded-xl shadow-2xs overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 bg-muted/20 border-b border-border text-xs">
            <div className="flex items-center gap-2 font-medium text-foreground">
              <Sparkles className="size-3.5 text-primary" />
              <span>Live Dataset Preview</span>
              <span className="text-[11px] text-muted-foreground font-normal">
                (Showing top {sampleRows.length} sample rows matching current filters)
              </span>
            </div>
            <span className="text-[11px] font-mono text-muted-foreground">
              {previewColumns.length} columns active
            </span>
          </div>

          <div className="overflow-x-auto max-w-full">
            {isLoadingPreview ? (
              <div className="flex items-center justify-center p-12 text-xs text-muted-foreground gap-2 font-mono">
                <RefreshCw className="size-4 animate-spin text-primary" />
                <span>Loading preview records from Supabase...</span>
              </div>
            ) : sampleRows.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center text-xs text-muted-foreground gap-2">
                <Info className="size-6 text-muted-foreground/50" />
                <span className="font-medium text-foreground">No records found matching current filters</span>
                <span>Try expanding your date range or selecting all event types.</span>
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-muted/40 border-b border-border text-[11px] font-medium text-muted-foreground select-none">
                    <th className="py-2.5 px-3 font-mono w-10 text-center">#</th>
                    {previewColumns.map((col) => (
                      <th key={col.key} className="py-2.5 px-3 font-medium whitespace-nowrap">
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 font-sans">
                  {sampleRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-muted/20 transition-colors">
                      <td className="py-2 px-3 font-mono text-muted-foreground/60 text-center text-[10px]">
                        {idx + 1}
                      </td>
                      {previewColumns.map((col) => {
                        const val = row[col.key]

                        if (col.key === "type_name") {
                          return (
                            <td key={col.key} className="py-2 px-3 whitespace-nowrap">
                              <span className="bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold">
                                {String(val || "-")}
                              </span>
                            </td>
                          )
                        }

                        if (col.key === "summary") {
                          return (
                            <td key={col.key} className="py-2 px-3 max-w-xs truncate text-muted-foreground" title={String(val)}>
                              {String(val || "-")}
                            </td>
                          )
                        }

                        if (col.key === "raw_details") {
                          return (
                            <td key={col.key} className="py-2 px-3 font-mono text-[10px] text-muted-foreground max-w-xs truncate">
                              {String(val || "{}")}
                            </td>
                          )
                        }

                        return (
                          <td key={col.key} className="py-2 px-3 whitespace-nowrap font-mono text-foreground text-xs">
                            {val !== undefined && val !== null && val !== "" ? String(val) : "-"}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* 5. CUSTOMIZE COLUMNS DIALOG */}
        <Dialog open={showColumnDialog} onOpenChange={setShowColumnDialog}>
          <DialogContent className="max-w-md p-4">
            <DialogHeader>
              <DialogTitle className="text-sm font-semibold flex items-center gap-2">
                <Columns3 className="size-4 text-primary" />
                Customize Export Columns
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Select which columns to include in your {exportFormat.toUpperCase()} export.
              </DialogDescription>
            </DialogHeader>

            <div className="flex items-center justify-between py-2 border-b border-border text-xs">
              <span className="font-medium text-foreground">
                {selectedColumnKeys.length} of {availableColumns.length} columns selected
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedColumnKeys(availableColumns.map((c) => c.key))}
                  className="text-xs text-primary hover:underline font-medium"
                >
                  Select All
                </button>
                <span className="text-muted-foreground">•</span>
                <button
                  type="button"
                  onClick={() => {
                    const defaults = availableColumns.filter((c) => c.defaultSelected).map((c) => c.key)
                    setSelectedColumnKeys(defaults)
                  }}
                  className="text-xs text-muted-foreground hover:underline font-medium"
                >
                  Reset Defaults
                </button>
              </div>
            </div>

            <div className="max-h-72 overflow-y-auto flex flex-col gap-1.5 py-2">
              {availableColumns.map((col) => {
                const isSelected = selectedColumnKeys.includes(col.key)
                return (
                  <div
                    key={col.key}
                    onClick={() => toggleColumnKey(col.key)}
                    className={cn(
                      "flex items-center justify-between p-2 rounded cursor-pointer text-xs select-none transition-colors border",
                      isSelected
                        ? "bg-primary/5 border-primary/30 text-foreground"
                        : "hover:bg-muted/40 border-transparent text-muted-foreground"
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      {isSelected ? (
                        <CheckSquare className="size-3.5 text-primary shrink-0" />
                      ) : (
                        <Square className="size-3.5 text-muted-foreground shrink-0" />
                      )}
                      <span className="font-medium text-foreground">{col.label}</span>
                    </div>
                    <span className="font-mono text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      {col.key}
                    </span>
                  </div>
                )
              })}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button size="sm" onClick={() => setShowColumnDialog(false)} className="h-8 text-xs">
                Apply Columns
              </Button>
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </PageContainer>
  )
}
