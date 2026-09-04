"use client"

import * as React from "react"
import {
  Search,
  ChevronDown,
  RefreshCw,
  X,
  SlidersHorizontal,
  Copy,
  Check,
  Server,
  Columns3,
  ToggleLeft,
  Type,
  Clock,
  Trash2,
  Laptop,
  AlertTriangle,
} from "lucide-react"
import { useTimezoneStore } from "@/lib/use-timezone-store"
import { timezones, mapLabelToIana, formatTimestamp } from "@/lib/timezones"
import { PageContainer } from "./page-container"
import { createClient } from "@/lib/supabase/client"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog"
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

interface Device {
  device_id: string
  secret_hash: string
  is_active: boolean
  label: string | null
  created_at: string
  last_seen_at: string | null
}

export function DevicesClient() {
  const { selectedTimezone } = useTimezoneStore()
  const [devices, setDevices] = React.useState<Device[]>([])
  const [selectedDevice, setSelectedDevice] = React.useState<Device | null>(null)
  
  // Search & Filter Settings (Staging)
  const [stagedSearchTerm, setStagedSearchTerm] = React.useState("")
  const [stagedSearchField, setStagedSearchField] = React.useState<"device_id" | "label">("device_id")
  const [stagedStatusFilter, setStagedStatusFilter] = React.useState<string>("ALL")

  // Active/Applied Filter Settings
  const [appliedSearchTerm, setAppliedSearchTerm] = React.useState("")
  const [appliedSearchField, setAppliedSearchField] = React.useState<"device_id" | "label">("device_id")
  const [appliedStatusFilter, setAppliedStatusFilter] = React.useState<string>("ALL")

  // Delete confirmation state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false)
  const [deleteDeviceId, setDeleteDeviceId] = React.useState("")
  const [deleteError, setDeleteError] = React.useState("")

  // Column visibility states
  const [visibleColumns, setVisibleColumns] = React.useState({
    device_id: true,
    label: true,
    is_active: true,
    created_at: true,
    last_seen_at: true,
  })
  const [showColumnDropdown, setShowColumnDropdown] = React.useState(false)

  // Refresh & Poll states
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const [copiedText, setCopiedText] = React.useState<string | null>(null)

  const supabase = createClient()

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedText(text)
    setTimeout(() => setCopiedText(null), 2000)
  }

  const toggleColumn = (col: keyof typeof visibleColumns) => {
    setVisibleColumns(prev => ({ ...prev, [col]: !prev[col] }))
  }

  // Count active columns
  const activeColumnsCount = Object.values(visibleColumns).filter(Boolean).length

  // Column resizing state
  const [colWidths, setColWidths] = React.useState<Record<string, number>>({
    device_id: 180,
    label: 200,
    is_active: 130,
    created_at: 200,
    last_seen_at: 200,
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

  // Fetch Devices from Supabase
  const fetchDevices = React.useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("devices")
        .select("*")
        .order("created_at", { ascending: false })
      
      if (!error && data) {
        setDevices(data as Device[])
      } else {
        setDevices([])
      }
    } catch (e) {
      setDevices([])
    }
  }, [supabase])

  // Trigger manual refresh
  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetchDevices()
    setTimeout(() => setIsRefreshing(false), 600)
  }

  // Initial and Automatic polling (every 10s)
  React.useEffect(() => {
    fetchDevices()
    const interval = setInterval(fetchDevices, 10000)
    return () => clearInterval(interval)
  }, [fetchDevices])

  // Toggle is_active status directly
  const handleToggleActive = async (e: React.MouseEvent, deviceId: string, currentActive: boolean) => {
    e.stopPropagation() // Prevent table row click from opening/changing selectedDevice sheet
    
    // Optimistic UI updates
    setDevices(prev => prev.map(d => d.device_id === deviceId ? { ...d, is_active: !currentActive } : d))
    if (selectedDevice?.device_id === deviceId) {
      setSelectedDevice(prev => prev ? { ...prev, is_active: !currentActive } : null)
    }

    try {
      const { error } = await supabase
        .from("devices")
        .update({ is_active: !currentActive })
        .eq("device_id", deviceId)

      if (error) {
        // Rollback on error
        setDevices(prev => prev.map(d => d.device_id === deviceId ? { ...d, is_active: currentActive } : d))
        if (selectedDevice?.device_id === deviceId) {
          setSelectedDevice(prev => prev ? { ...prev, is_active: currentActive } : null)
        }
        console.error("Error toggling device status:", error.message)
      }
    } catch (err: any) {
      // Rollback on error
      setDevices(prev => prev.map(d => d.device_id === deviceId ? { ...d, is_active: currentActive } : d))
      if (selectedDevice?.device_id === deviceId) {
        setSelectedDevice(prev => prev ? { ...prev, is_active: currentActive } : null)
      }
      console.error("Failed to toggle device status:", err)
    }
  }

  // Open Delete Confirmation Dialog
  const handleOpenDeleteDialog = (deviceId: string) => {
    setDeleteDeviceId(deviceId)
    setDeleteError("")
    setIsDeleteDialogOpen(true)
  }

  // Delete Device Action
  const handleDeleteDeviceSubmit = async () => {
    setDeleteError("")
    try {
      const { error } = await supabase
        .from("devices")
        .delete()
        .eq("device_id", deleteDeviceId)

      if (error) {
        setDeleteError(error.message)
        return
      }

      await fetchDevices()
      if (selectedDevice?.device_id === deleteDeviceId) {
        setSelectedDevice(null)
      }
      setIsDeleteDialogOpen(false)
    } catch (err: any) {
      setDeleteError(err.message || "An unexpected error occurred.")
    }
  }

  // Filter Transactional State logic
  const hasChanges =
    stagedSearchTerm !== appliedSearchTerm ||
    stagedSearchField !== appliedSearchField ||
    stagedStatusFilter !== appliedStatusFilter

  const isFilterApplied =
    appliedSearchTerm !== "" ||
    appliedStatusFilter !== "ALL"

  const handleApplyFilters = () => {
    setAppliedSearchTerm(stagedSearchTerm)
    setAppliedSearchField(stagedSearchField)
    setAppliedStatusFilter(stagedStatusFilter)
  }

  const handleClearFilters = () => {
    setStagedSearchTerm("")
    setStagedSearchField("device_id")
    setStagedStatusFilter("ALL")

    setAppliedSearchTerm("")
    setAppliedSearchField("device_id")
    setAppliedStatusFilter("ALL")
  }

  // Filter local listings based on applied filters
  const filteredDevices = React.useMemo(() => {
    return devices.filter(dev => {
      // 1. Search term match
      if (appliedSearchTerm.trim() !== "") {
        const queryLower = appliedSearchTerm.toLowerCase()
        if (appliedSearchField === "device_id") {
          if (!dev.device_id.toLowerCase().includes(queryLower)) return false
        } else {
          const val = dev.label || ""
          if (!val.toLowerCase().includes(queryLower)) return false
        }
      }

      // 2. Active status match
      if (appliedStatusFilter !== "ALL") {
        const checkActive = appliedStatusFilter === "ACTIVE"
        if (dev.is_active !== checkActive) return false
      }

      return true
    })
  }, [devices, appliedSearchTerm, appliedSearchField, appliedStatusFilter])

  const getCleanTimezoneName = (tz: string) => {
    return mapLabelToIana(tz)
  }

  const formatDateString = (dateStr: string | null, timezone: string) => {
    if (!dateStr) return "Never"
    return formatTimestamp(dateStr, timezone)
  }

  return (
    <PageContainer
      title="Devices"
      description={
        <span className="flex flex-wrap gap-2 items-center">
          <span>Register, configure, and monitor router meter hardware installations across active households.</span>
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
                  <SelectItem value="label">label</SelectItem>
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

            {/* Active Status Filter */}
            <Select
              value={stagedStatusFilter}
              onValueChange={(val) => setStagedStatusFilter(val || "ALL")}
            >
              <SelectTrigger className="flex items-center gap-1.5 px-2.5 border border-border bg-background hover:bg-muted/30 rounded-md h-8 text-xs text-foreground font-medium cursor-pointer transition-all shadow-none focus:ring-0 focus:ring-offset-0">
                <SlidersHorizontal className="size-3.5 text-muted-foreground/60 shrink-0" />
                <SelectValue placeholder="Status">
                  {stagedStatusFilter === "ALL" ? "All Statuses" : stagedStatusFilter === "ACTIVE" ? "Active Only" : "Inactive Only"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="ACTIVE">Active Only</SelectItem>
                <SelectItem value="INACTIVE">Inactive Only</SelectItem>
              </SelectContent>
            </Select>

            {/* Columns Select Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowColumnDropdown(!showColumnDropdown)}
                className="flex items-center gap-1.5 px-2.5 border border-border rounded-md h-8 bg-background hover:bg-muted/30 cursor-pointer text-xs text-foreground select-none font-medium transition-all"
              >
                <Columns3 className="size-3.5 shrink-0" />
                <span>Columns ({activeColumnsCount}/5)</span>
                <ChevronDown className="size-3 text-muted-foreground/60" />
              </button>

              {showColumnDropdown && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowColumnDropdown(false)} />
                  <div className="absolute left-0 mt-1.5 w-44 bg-popover border border-border rounded-lg shadow-lg z-20 p-2 text-xs text-foreground space-y-1">
                    {Object.keys(visibleColumns).map((col) => (
                      <label key={col} className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-muted/50 rounded-md cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={visibleColumns[col as keyof typeof visibleColumns]}
                          onChange={() => toggleColumn(col as keyof typeof visibleColumns)}
                          className="rounded border-border text-primary focus:ring-primary size-3.5"
                        />
                        <span>{col}</span>
                      </label>
                    ))}
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

          {/* Right side Actions */}
          <div className="flex items-center gap-2">
            <Button
              onClick={handleRefresh}
              variant="outline"
              size="icon"
              title="Refresh devices"
            >
              <RefreshCw className={`size-3.5 text-muted-foreground ${isRefreshing ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Main Content Table */}
        <div className="overflow-x-auto w-full min-w-0 custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="border-b bg-muted/10 text-xs font-semibold text-muted-foreground uppercase tracking-wider select-none font-mono">
                {visibleColumns.device_id && (
                  <th
                    style={{ width: `${colWidths.device_id || 180}px`, minWidth: `${colWidths.device_id || 180}px` }}
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
                {visibleColumns.label && (
                  <th
                    style={{ width: `${colWidths.label || 200}px`, minWidth: `${colWidths.label || 200}px` }}
                    className="p-3 border-r border-border/40 relative group/th"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <Laptop className="size-3 text-muted-foreground/60 shrink-0" />
                      <span className="truncate">label</span>
                      <span className="text-[11px] text-muted-foreground/60 lowercase font-normal shrink-0">text</span>
                    </div>
                    <div
                      onMouseDown={(e) => handleColumnResize(e, "label")}
                      className="absolute right-0 top-0 bottom-0 w-2.5 cursor-col-resize hover:bg-primary/50 active:bg-primary z-20 opacity-0 group-hover/th:opacity-100 transition-opacity"
                      title="Drag to resize column"
                    />
                  </th>
                )}
                {visibleColumns.is_active && (
                  <th
                    style={{ width: `${colWidths.is_active || 130}px`, minWidth: `${colWidths.is_active || 130}px` }}
                    className="p-3 border-r border-border/40 relative group/th"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <ToggleLeft className="size-3 text-muted-foreground/60 shrink-0" />
                      <span className="truncate">is_active</span>
                      <span className="text-[11px] text-muted-foreground/60 lowercase font-normal shrink-0">bool</span>
                    </div>
                    <div
                      onMouseDown={(e) => handleColumnResize(e, "is_active")}
                      className="absolute right-0 top-0 bottom-0 w-2.5 cursor-col-resize hover:bg-primary/50 active:bg-primary z-20 opacity-0 group-hover/th:opacity-100 transition-opacity"
                      title="Drag to resize column"
                    />
                  </th>
                )}
                {visibleColumns.created_at && (
                  <th
                    style={{ width: `${colWidths.created_at || 200}px`, minWidth: `${colWidths.created_at || 200}px` }}
                    className="p-3 border-r border-border/40 relative group/th"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <Clock className="size-3 text-muted-foreground/60 shrink-0" />
                      <span className="truncate">created_at</span>
                      <span className="text-[11px] text-muted-foreground/60 lowercase font-normal shrink-0">timestamptz</span>
                    </div>
                    <div
                      onMouseDown={(e) => handleColumnResize(e, "created_at")}
                      className="absolute right-0 top-0 bottom-0 w-2.5 cursor-col-resize hover:bg-primary/50 active:bg-primary z-20 opacity-0 group-hover/th:opacity-100 transition-opacity"
                      title="Drag to resize column"
                    />
                  </th>
                )}
                {visibleColumns.last_seen_at && (
                  <th
                    style={{ width: `${colWidths.last_seen_at || 200}px`, minWidth: `${colWidths.last_seen_at || 200}px` }}
                    className="p-3 relative group/th"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <Clock className="size-3 text-muted-foreground/60 shrink-0" />
                      <span className="truncate">last_seen_at</span>
                      <span className="text-[11px] text-muted-foreground/60 lowercase font-normal shrink-0">timestamptz</span>
                    </div>
                    <div
                      onMouseDown={(e) => handleColumnResize(e, "last_seen_at")}
                      className="absolute right-0 top-0 bottom-0 w-2.5 cursor-col-resize hover:bg-primary/50 active:bg-primary z-20 opacity-0 group-hover/th:opacity-100 transition-opacity"
                      title="Drag to resize column"
                    />
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-xs sm:text-sm">
              {filteredDevices.length === 0 ? (
                <tr>
                  <td colSpan={activeColumnsCount} className="p-8 text-center text-muted-foreground font-mono">
                    No devices registered matching filters
                  </td>
                </tr>
              ) : (
                filteredDevices.map((dev) => {
                  const createdStr = formatDateString(dev.created_at, selectedTimezone)
                  const lastSeenStr = formatDateString(dev.last_seen_at, selectedTimezone)

                  return (
                    <tr
                      key={dev.device_id}
                      onClick={() => {
                        setSelectedDevice(dev)
                      }}
                      className={`transition-colors border-b border-border/40 hover:bg-muted/10 cursor-pointer ${
                        selectedDevice?.device_id === dev.device_id ? "bg-muted/20" : ""
                      }`}
                    >
                      {visibleColumns.device_id && (
                        <td
                          style={{ maxWidth: `${colWidths.device_id || 180}px` }}
                          className="p-3 font-semibold text-foreground border-r border-border/40 font-mono"
                          title={dev.device_id}
                        >
                          <div className="flex items-center justify-between gap-2 group/cell min-w-0">
                            <span className="truncate">{dev.device_id}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleCopyText(dev.device_id)
                              }}
                              className="opacity-0 group-hover/cell:opacity-100 p-1 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded transition-all cursor-pointer shrink-0"
                              title="Copy Device ID"
                            >
                              {copiedText === dev.device_id ? (
                                <Check className="size-3 text-primary" />
                              ) : (
                                <Copy className="size-3" />
                              )}
                            </button>
                          </div>
                        </td>
                      )}
                      {visibleColumns.label && (
                        <td
                          style={{ maxWidth: `${colWidths.label || 200}px` }}
                          className="p-3 text-muted-foreground border-r border-border/40 truncate"
                          title={dev.label || "null"}
                        >
                          {dev.label ? (
                            <span className="text-foreground truncate block">{dev.label}</span>
                          ) : (
                            <span className="italic text-xs text-muted-foreground/50">null</span>
                          )}
                        </td>
                      )}
                      {visibleColumns.is_active && (
                        <td
                          style={{ maxWidth: `${colWidths.is_active || 130}px` }}
                          className="p-3 border-r border-border/40"
                        >
                          <Button
                            onClick={(e) => handleToggleActive(e, dev.device_id, dev.is_active)}
                            variant="outline"
                            size="sm"
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border cursor-pointer select-none transition-all active:scale-95 h-auto ${
                              dev.is_active
                                ? "bg-primary/10 hover:bg-primary/20 text-primary border-primary/20"
                                : "bg-muted hover:bg-muted/80 text-muted-foreground border-border"
                            }`}
                            title={`Click to toggle status (Currently: ${dev.is_active ? "Active" : "Inactive"})`}
                          >
                            <span className={`size-1.5 rounded-full ${dev.is_active ? "bg-primary" : "bg-muted-foreground"}`} />
                            {dev.is_active ? "Active" : "Inactive"}
                          </Button>
                        </td>
                      )}
                      {visibleColumns.created_at && (
                        <td
                          style={{ maxWidth: `${colWidths.created_at || 200}px` }}
                          className="p-3 text-muted-foreground font-mono border-r border-border/40 truncate"
                          title={createdStr}
                        >
                          {createdStr}
                        </td>
                      )}
                      {visibleColumns.last_seen_at && (
                        <td
                          style={{ maxWidth: `${colWidths.last_seen_at || 200}px` }}
                          className="p-3 text-muted-foreground font-mono truncate"
                          title={lastSeenStr}
                        >
                          {lastSeenStr}
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

      {/* Overlay Slide-over Sheet Details */}
      {selectedDevice && (
        <>
          {/* Overlay backdrop */}
          <div
            onClick={() => setSelectedDevice(null)}
            className="fixed inset-0 z-40 bg-black/45 backdrop-blur-xs transition-opacity duration-300"
          />

          {/* Sheet overlay panel */}
          <div className="fixed inset-y-0 right-0 w-full sm:w-[500px] z-50 bg-background border-l border-border shadow-2xl flex flex-col transition-transform duration-300 translate-x-0 text-left">
            {/* Sheet overlay panel Header */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3 shrink-0 bg-muted/5">
              <div className="flex items-center gap-2">
                <Server className="size-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">Device Details</span>
              </div>
              <Button
                onClick={() => setSelectedDevice(null)}
                variant="ghost"
                size="icon-sm"
                className="size-7 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="size-4" />
              </Button>
            </div>

            {/* Scrollable Viewport */}
            <div className="flex-1 overflow-y-auto p-5 text-left">
              <div className="space-y-6">
                {/* Title Header */}
                <div>
                  <h2 className="text-base font-semibold text-foreground font-mono">
                    {selectedDevice.device_id}
                  </h2>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-xs text-muted-foreground">
                      Label: {selectedDevice.label || "No Label set"}
                    </span>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button
                      onClick={() => handleOpenDeleteDialog(selectedDevice.device_id)}
                      variant="destructive"
                      size="sm"
                      className="font-semibold cursor-pointer select-none"
                    >
                      <Trash2 className="size-3.5" />
                      Delete Device
                    </Button>
                  </div>
                </div>

                <hr className="border-border/60" />

                {/* Attributes Grid List */}
                <div className="space-y-3.5 text-xs">
                  <div className="flex justify-between items-center border-b border-border/30 pb-2">
                    <span className="text-muted-foreground font-mono">device_id</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[10px] text-foreground font-semibold select-all">
                        {selectedDevice.device_id}
                      </span>
                      <Button
                        onClick={() => handleCopyText(selectedDevice.device_id)}
                        variant="ghost"
                        size="icon"
                        className="size-5 text-muted-foreground hover:text-foreground cursor-pointer"
                        title="Copy ID"
                      >
                        {copiedText === selectedDevice.device_id ? <Check className="size-3 text-primary" /> : <Copy className="size-3" />}
                      </Button>
                    </div>
                  </div>
                  <div className="flex justify-between items-center border-b border-border/30 pb-2">
                    <span className="text-muted-foreground font-mono">label</span>
                    <span className="font-medium text-foreground">
                      {selectedDevice.label || <span className="italic text-muted-foreground/40 text-[10px]">null</span>}
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-b border-border/30 pb-2">
                    <span className="text-muted-foreground font-mono">created_at</span>
                    <span className="font-medium text-foreground font-mono">
                      {formatDateString(selectedDevice.created_at, selectedTimezone)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-b border-border/30 pb-2">
                    <span className="text-muted-foreground font-mono">last_seen_at</span>
                    <span className="font-medium text-foreground font-mono">
                      {formatDateString(selectedDevice.last_seen_at, selectedTimezone)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pb-1">
                    <span className="text-muted-foreground font-mono">is_active</span>
                    <Button
                      onClick={(e) => handleToggleActive(e, selectedDevice.device_id, selectedDevice.is_active)}
                      variant="outline"
                      size="sm"
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold border cursor-pointer select-none transition-all active:scale-95 h-auto ${
                        selectedDevice.is_active
                          ? "bg-primary/10 hover:bg-primary/20 text-primary border-primary/20"
                          : "bg-muted hover:bg-muted/80 text-muted-foreground border-border"
                      }`}
                      title="Click to toggle status"
                    >
                      <span className={`w-2 h-2 rounded-full ${selectedDevice.is_active ? "bg-primary animate-pulse" : "bg-zinc-400"}`} />
                      <span>{selectedDevice.is_active ? "Enabled & Processing Telemetry" : "Disabled"}</span>
                    </Button>
                  </div>
                </div>

                <hr className="border-border/60" />

                {/* Schema Details */}
                <div className="space-y-3">
                  <h3 className="text-[10px] font-bold text-foreground uppercase tracking-wider font-mono">
                    Database Definition
                  </h3>
                  <div className="flex items-center gap-3 p-3 border border-border rounded-lg bg-muted/10">
                    <div className="p-2 bg-primary/10 text-primary rounded-md">
                      <Server className="size-4" />
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="font-semibold text-xs text-foreground font-mono">
                        public.devices
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        PostgreSQL DB Table representation
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-sm text-left bg-popover border border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold text-destructive">De-register Router Device?</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Are you sure you want to permanently delete device <span className="font-mono font-semibold text-foreground">{deleteDeviceId}</span>? All system records and hardware authorizations for this device ID will be removed. This action is irreversible.
            </DialogDescription>
          </DialogHeader>

          {deleteError && (
            <div className="flex items-center gap-2 p-2.5 bg-destructive/10 border border-destructive/20 text-destructive rounded-md text-xs font-medium">
              <AlertTriangle className="size-3.5 shrink-0" />
              <span>{deleteError}</span>
            </div>
          )}

          <DialogFooter className="pt-2 gap-2">
            <DialogClose render={<Button variant="outline" size="sm" type="button" />}>
              Cancel
            </DialogClose>
            <Button
              onClick={handleDeleteDeviceSubmit}
              variant="destructive"
              size="sm"
              className="font-semibold cursor-pointer text-xs flex items-center gap-1"
            >
              <Trash2 className="size-3.5" />
              Permanently Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}
