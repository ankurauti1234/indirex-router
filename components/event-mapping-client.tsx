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
  Plus,
  Type,
  Clock,
  Laptop,
  AlertTriangle,
  Code,
  BookOpen,
  Braces,
} from "lucide-react"
import { useTimezoneStore } from "@/lib/use-timezone-store"
import { timezones } from "@/lib/timezones"
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

interface EventMapping {
  id: number
  name: string
  description: string
  created_at: string
  is_active: boolean
  structure?: any
  sample?: any
  template?: string
}

interface EventTypeMetadata {
  description: string
  template?: string
  generic_structure?: any
  sample_event?: any
}

export function EventMappingClient() {
  const { selectedTimezone } = useTimezoneStore()
  const [mappings, setMappings] = React.useState<EventMapping[]>([])
  const [rawEventTypes, setRawEventTypes] = React.useState<any[]>([])
  const [selectedMapping, setSelectedMapping] = React.useState<EventMapping | null>(null)

  // Search & Filter Settings (Staging)
  const [stagedSearchTerm, setStagedSearchTerm] = React.useState("")
  const [stagedSearchField, setStagedSearchField] = React.useState<"name" | "id">("name")
  const [stagedStatusFilter, setStagedStatusFilter] = React.useState<string>("ALL")

  // Active/Applied Filter Settings
  const [appliedSearchTerm, setAppliedSearchTerm] = React.useState("")
  const [appliedSearchField, setAppliedSearchField] = React.useState<"name" | "id">("name")
  const [appliedStatusFilter, setAppliedStatusFilter] = React.useState<string>("ALL")

  // Add Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false)
  const [newId, setNewId] = React.useState("")
  const [newName, setNewName] = React.useState("")
  const [newDesc, setNewDesc] = React.useState("")
  const [newTemplate, setNewTemplate] = React.useState("")
  const [newGenericStructure, setNewGenericStructure] = React.useState("")
  const [newSampleEvent, setNewSampleEvent] = React.useState("")
  const [addError, setAddError] = React.useState("")

  // Edit Dialog states
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false)
  const [editId, setEditId] = React.useState<number | null>(null)
  const [editName, setEditName] = React.useState("")
  const [editDesc, setEditDesc] = React.useState("")
  const [editTemplate, setEditTemplate] = React.useState("")
  const [editGenericStructure, setEditGenericStructure] = React.useState("")
  const [editSampleEvent, setEditSampleEvent] = React.useState("")
  const [editError, setEditError] = React.useState("")

  // Column visibility states
  const [visibleColumns, setVisibleColumns] = React.useState({
    id: true,
    name: true,
    description: true,
    created_at: true,
    is_active: true,
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

  // Fetch Event Mappings from Supabase
  const fetchMappingsData = React.useCallback(async () => {
    try {
      const [typesRes, rulesRes] = await Promise.all([
        supabase.from("event_types").select("*").order("type", { ascending: true }),
        supabase.from("event_details_rules").select("*")
      ])

      const typesData = typesRes.data
      const rulesData = rulesRes.data || []

      if (!typesRes.error && typesData) {
        setRawEventTypes(typesData)
        const formatted: EventMapping[] = typesData.map((d: any) => {
          const rule = rulesData.find((r: any) => r.type_id === d.type)

          const descText = d.description || "No description set"
          const templateText = rule?.template || undefined

          return {
            id: d.type,
            name: d.name || `TYPE_${d.type}`,
            description: descText,
            created_at: d.created_at || new Date().toISOString(),
            is_active: true,
            structure: rule?.structure || null,
            sample: rule?.sample || null,
            template: templateText,
          }
        })
        setMappings(formatted)
      } else {
        setMappings([])
      }
    } catch (e) {
      setMappings([])
    }
  }, [supabase])

  // Trigger manual refresh
  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetchMappingsData()
    setTimeout(() => setIsRefreshing(false), 600)
  }

  // Initial and Automatic polling (every 10s)
  React.useEffect(() => {
    fetchMappingsData()
    const interval = setInterval(fetchMappingsData, 10000)
    return () => clearInterval(interval)
  }, [fetchMappingsData])

  // Add Mapping Submit
  const handleAddMappingSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddError("")
    if (!newId || !newName.trim()) {
      setAddError("Event ID and Name are required.")
      return
    }

    // JSON Validations
    let genericObj = undefined
    if (newGenericStructure.trim()) {
      try {
        genericObj = JSON.parse(newGenericStructure)
      } catch (err) {
        setAddError("Generic Structure must be a valid JSON object.")
        return
      }
    }

    let sampleObj = undefined
    if (newSampleEvent.trim()) {
      try {
        sampleObj = JSON.parse(newSampleEvent)
      } catch (err) {
        setAddError("Sample Event Payload must be a valid JSON object.")
        return
      }
    }

    const typeId = parseInt(newId)

    try {
      const { error: typeError } = await supabase.from("event_types").insert({
        type: typeId,
        name: newName.trim().toUpperCase(),
        description: newDesc.trim() || "No description set",
        created_at: new Date().toISOString(),
      })
      if (typeError) {
        setAddError(typeError.message)
        return
      }

      const { error: ruleError } = await supabase.from("event_details_rules").insert({
        type_id: typeId,
        template: newTemplate.trim() || null,
        structure: genericObj || null,
        sample: sampleObj || null,
      })
      if (ruleError) {
        setAddError(ruleError.message)
        return
      }

      await fetchMappingsData()
      setNewId("")
      setNewName("")
      setNewDesc("")
      setNewTemplate("")
      setNewGenericStructure("")
      setNewSampleEvent("")
      setIsAddDialogOpen(false)
    } catch (err: any) {
      setAddError(err.message || "An unexpected error occurred.")
    }
  }

  // Open Edit Dialog
  const handleOpenEditDialog = (mapping: EventMapping) => {
    setEditId(mapping.id)
    setEditName(mapping.name)
    setEditDesc(mapping.description)
    setEditTemplate(mapping.template || "")
    setEditGenericStructure(mapping.structure ? JSON.stringify(mapping.structure, null, 2) : "")
    setEditSampleEvent(mapping.sample ? JSON.stringify(mapping.sample, null, 2) : "")
    setEditError("")
    setIsEditDialogOpen(true)
  }

  // Edit Mapping Submit
  const handleEditMappingSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setEditError("")
    if (editId === null || !editName.trim()) {
      setEditError("Name is required.")
      return
    }

    // JSON Validations
    let genericObj = undefined
    if (editGenericStructure.trim()) {
      try {
        genericObj = JSON.parse(editGenericStructure)
      } catch (err) {
        setEditError("Generic Structure must be a valid JSON object.")
        return
      }
    }

    let sampleObj = undefined
    if (editSampleEvent.trim()) {
      try {
        sampleObj = JSON.parse(editSampleEvent)
      } catch (err) {
        setEditError("Sample Event Payload must be a valid JSON object.")
        return
      }
    }

    try {
      const { error: typeError } = await supabase
        .from("event_types")
        .update({
          name: editName.trim().toUpperCase(),
          description: editDesc.trim() || "No description set",
        })
        .eq("type", editId)

      if (typeError) {
        setEditError(typeError.message)
        return
      }

      const { error: ruleError } = await supabase
        .from("event_details_rules")
        .upsert({
          type_id: editId,
          template: editTemplate.trim() || null,
          structure: genericObj || null,
          sample: sampleObj || null,
        }, { onConflict: "type_id" })

      if (ruleError) {
        setEditError(ruleError.message)
        return
      }

      await fetchMappingsData()
      if (selectedMapping?.id === editId) {
        setSelectedMapping(prev => prev ? {
          ...prev,
          name: editName.trim().toUpperCase(),
          description: editDesc.trim() || "No description set",
          structure: genericObj || null,
          sample: sampleObj || null,
          template: editTemplate.trim() || undefined,
        } : null)
      }
      setIsEditDialogOpen(false)
    } catch (err: any) {
      setEditError(err.message || "An unexpected error occurred.")
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
    setStagedSearchField("name")
    setStagedStatusFilter("ALL")

    setAppliedSearchTerm("")
    setAppliedSearchField("name")
    setAppliedStatusFilter("ALL")
  }

  // Filter local mappings based on applied filters
  const filteredMappings = React.useMemo(() => {
    return mappings.filter(m => {
      // 1. Search term match
      if (appliedSearchTerm.trim() !== "") {
        const queryLower = appliedSearchTerm.toLowerCase()
        if (appliedSearchField === "name") {
          if (!m.name.toLowerCase().includes(queryLower)) return false
        } else {
          if (!m.id.toString().includes(queryLower)) return false
        }
      }

      // 2. Active status match (event mappings are active by default)
      if (appliedStatusFilter !== "ALL") {
        const checkActive = appliedStatusFilter === "ACTIVE"
        if (m.is_active !== checkActive) return false
      }

      return true
    })
  }, [mappings, appliedSearchTerm, appliedSearchField, appliedStatusFilter])

  // Resolve timezone human label to standard IANA timezone name
  const mapLabelToIana = (tzLabel: string): string => {
    if (tzLabel.startsWith("Auto (") && tzLabel.endsWith(")")) {
      return tzLabel.slice(6, -1)
    }
    const found = timezones.find(t => t.label === tzLabel)
    if (!found) return "UTC"

    switch (found.value) {
      case "UTC": return "UTC"
      case "GMT": return "GMT"
      case "IST-IN": return "Asia/Kolkata"
      case "PST": return "America/Los_Angeles"
      case "EST": return "America/New_York"
      case "CST": return "America/Chicago"
      case "MST": return "America/Denver"
      case "CET": return "Europe/Berlin"
      default: return found.value
    }
  }

  const getCleanTimezoneName = (tz: string) => {
    return mapLabelToIana(tz)
  }

  const formatDateString = (dateStr: string | null, timezone: string) => {
    if (!dateStr) return "Never"
    const cleanTz = mapLabelToIana(timezone)
    const date = new Date(dateStr)
    try {
      const options: Intl.DateTimeFormatOptions = {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: cleanTz
      }
      return date.toLocaleString('en-US', options).replace(/,/g, '')
    } catch (e) {
      const optionsFallback: Intl.DateTimeFormatOptions = {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }
      return date.toLocaleString('en-US', optionsFallback).replace(/,/g, '')
    }
  }

  return (
    <PageContainer
      title="Event Mapping"
      description={
        <span className="flex flex-wrap gap-2 items-center">
          <span>Map raw device telemetry signals to human-readable audience measurement event definitions.</span>
          <span className="bg-primary/10 text-primary text-[10px] font-mono font-medium px-2 py-0.5 rounded border border-primary/20 shrink-0">
            Timezone: {getCleanTimezoneName(selectedTimezone)}
          </span>
        </span>
      }
    >

      {/* Main Database Grid Editor Container */}
      <div className="flex flex-col border border-border bg-card rounded-lg shadow-2xs overflow-hidden">
        {/* Supabase Table Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-muted/5 border-b border-border text-xs select-none">
          <div className="flex flex-wrap items-center gap-2">
            {/* Search Filter using ButtonGroup */}
            <ButtonGroup>
              <Select
                value={stagedSearchField}
                onValueChange={(val) => setStagedSearchField((val || "name") as any)}
              >
                <SelectTrigger className="h-8 text-xs font-mono font-medium bg-muted/20 border-border text-foreground">
                  <Search className="size-3.5 text-muted-foreground shrink-0 mr-1" />
                  <SelectValue placeholder="Field" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">name</SelectItem>
                  <SelectItem value="id">type (id)</SelectItem>
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
              title="Refresh mappings"
            >
              <RefreshCw className={`size-3.5 text-muted-foreground ${isRefreshing ? "animate-spin" : ""}`} />
            </Button>

            <Button
              onClick={() => {
                setNewId("")
                setNewName("")
                setNewDesc("")
                setNewTemplate("")
                setNewGenericStructure("")
                setNewSampleEvent("")
                setAddError("")
                setIsAddDialogOpen(true)
              }}
              size="sm"
              className="font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Plus className="size-3.5" />
              Add Event Mapping
            </Button>
          </div>
        </div>

        {/* Main Content Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b bg-muted/10 text-xs font-semibold text-muted-foreground uppercase tracking-wider select-none font-mono">
                {visibleColumns.id && (
                  <th className="p-3 border-r border-border/40">
                    <div className="flex items-center gap-1.5">
                      <Type className="size-3 text-muted-foreground/60" />
                      <span>type</span>
                      <span className="text-[11px] text-muted-foreground/60 lowercase font-normal">smallint</span>
                    </div>
                  </th>
                )}
                {visibleColumns.name && (
                  <th className="p-3 border-r border-border/40">
                    <div className="flex items-center gap-1.5">
                      <Laptop className="size-3 text-muted-foreground/60" />
                      <span>name</span>
                      <span className="text-[11px] text-muted-foreground/60 lowercase font-normal">text</span>
                    </div>
                  </th>
                )}
                {visibleColumns.description && (
                  <th className="p-3 border-r border-border/40">
                    <div className="flex items-center gap-1.5">
                      <Type className="size-3 text-muted-foreground/60" />
                      <span>description</span>
                      <span className="text-[11px] text-muted-foreground/60 lowercase font-normal">text</span>
                    </div>
                  </th>
                )}
                {visibleColumns.created_at && (
                  <th className="p-3 border-r border-border/40">
                    <div className="flex items-center gap-1.5">
                      <Clock className="size-3 text-muted-foreground/60" />
                      <span>created_at</span>
                      <span className="text-[11px] text-muted-foreground/60 lowercase font-normal">timestamptz</span>
                    </div>
                  </th>
                )}
                {visibleColumns.is_active && (
                  <th className="p-3">
                    <div className="flex items-center gap-1.5">
                      <ToggleLeft className="size-3 text-muted-foreground/60" />
                      <span>is_active</span>
                      <span className="text-[11px] text-muted-foreground/60 lowercase font-normal">bool</span>
                    </div>
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-xs sm:text-sm">
              {filteredMappings.length === 0 ? (
                <tr>
                  <td colSpan={activeColumnsCount} className="p-8 text-center text-muted-foreground font-mono">
                    No mappings registered matching filters
                  </td>
                </tr>
              ) : (
                filteredMappings.map((m) => {
                  const createdStr = formatDateString(m.created_at, selectedTimezone)

                  return (
                    <tr
                      key={m.id}
                      onClick={() => {
                        setSelectedMapping(m)
                      }}
                      className={`transition-colors border-b border-border/40 hover:bg-muted/10 cursor-pointer ${selectedMapping?.id === m.id ? "bg-muted/20" : ""
                        }`}
                    >
                      {visibleColumns.id && (
                        <td className="p-3 font-semibold text-muted-foreground border-r border-border/40 font-mono">
                          <div className="flex items-center justify-between gap-2 group/cell">
                            <span>{m.id}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleCopyText(m.id.toString())
                              }}
                              className="opacity-0 group-hover/cell:opacity-100 p-1 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded transition-all cursor-pointer shrink-0"
                              title="Copy type ID"
                            >
                              {copiedText === m.id.toString() ? (
                                <Check className="size-3 text-primary" />
                              ) : (
                                <Copy className="size-3" />
                              )}
                            </button>
                          </div>
                        </td>
                      )}
                      {visibleColumns.name && (
                        <td className="p-3 font-semibold text-foreground border-r border-border/40">
                          <div className="flex items-center justify-between gap-2 group/cell font-mono">
                            <span>{m.name}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleCopyText(m.name)
                              }}
                              className="opacity-0 group-hover/cell:opacity-100 p-1 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded transition-all cursor-pointer shrink-0"
                              title="Copy Name"
                            >
                              {copiedText === m.name ? (
                                <Check className="size-3 text-primary" />
                              ) : (
                                <Copy className="size-3" />
                              )}
                            </button>
                          </div>
                        </td>
                      )}
                      {visibleColumns.description && (
                        <td className="p-3 text-muted-foreground border-r border-border/40 max-w-sm truncate" title={m.description}>
                          {m.description}
                        </td>
                      )}
                      {visibleColumns.created_at && (
                        <td className="p-3 text-muted-foreground font-mono border-r border-border/40">
                          {createdStr}
                        </td>
                      )}
                      {visibleColumns.is_active && (
                        <td className="p-3">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${m.is_active
                              ? "bg-primary/10 text-primary border-primary/20"
                              : "bg-muted text-muted-foreground border-border"
                            }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${m.is_active ? "bg-primary" : "bg-muted-foreground"}`} />
                            {m.is_active ? "Active" : "Inactive"}
                          </span>
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
      {selectedMapping && (
        <>
          {/* Overlay backdrop */}
          <div
            onClick={() => setSelectedMapping(null)}
            className="fixed inset-0 z-40 bg-black/45 backdrop-blur-xs transition-opacity duration-300"
          />

          {/* Sheet overlay panel */}
          <div className="fixed inset-y-0 right-0 w-full sm:w-[500px] z-50 bg-background border-l border-border shadow-2xl flex flex-col transition-transform duration-300 translate-x-0 text-left">
            {/* Header Title */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3 shrink-0 bg-muted/5">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="size-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">Mapping Details</span>
              </div>
              <Button
                onClick={() => setSelectedMapping(null)}
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
                    {selectedMapping.name}
                  </h2>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-xs text-muted-foreground font-mono">
                      Schema Type identifier: {selectedMapping.id}
                    </span>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button
                      onClick={() => handleOpenEditDialog(selectedMapping)}
                      variant="outline"
                      size="sm"
                      className="font-mono text-xs font-semibold select-none cursor-pointer"
                    >
                      Edit Mapping Schema
                    </Button>
                  </div>
                </div>

                <hr className="border-border/60" />

                {/* Attributes Grid List */}
                <div className="space-y-3.5 text-xs">
                  <div className="flex justify-between items-center border-b border-border/30 pb-2">
                    <span className="text-muted-foreground">Mapping ID</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[10px] text-foreground font-semibold select-all">
                        {selectedMapping.id}
                      </span>
                      <Button
                        onClick={() => handleCopyText(selectedMapping.id.toString())}
                        variant="ghost"
                        size="icon"
                        className="size-5 text-muted-foreground hover:text-foreground cursor-pointer"
                        title="Copy Mapping ID"
                      >
                        {copiedText === selectedMapping.id.toString() ? <Check className="size-3 text-primary" /> : <Copy className="size-3" />}
                      </Button>
                    </div>
                  </div>
                  <div className="flex justify-between items-center border-b border-border/30 pb-2">
                    <span className="text-muted-foreground">Created At</span>
                    <span className="font-medium text-foreground font-mono">
                      {formatDateString(selectedMapping.created_at, selectedTimezone)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-b border-border/30 pb-2">
                    <span className="text-muted-foreground">Definition Scope</span>
                    <span className="font-medium text-foreground bg-muted/80 px-2 py-0.5 rounded border">
                      SYSTEM_STANDARD
                    </span>
                  </div>
                  <div className="flex justify-between items-start border-b border-border/30 pb-2">
                    <span className="text-muted-foreground shrink-0 mt-0.5 font-mono">description</span>
                    <span className="font-medium text-foreground text-right max-w-[260px]">
                      {selectedMapping.description}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pb-1">
                    <span className="text-muted-foreground font-mono">is_active</span>
                    <span className="font-medium text-foreground flex items-center gap-1.5">
                      <Check className="size-3.5 text-primary bg-primary/10 rounded-full p-0.5" />
                      <span>Enabled & Processing</span>
                    </span>
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
                        public.event_types
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

      {/* Add Mapping Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-3xl text-left bg-popover border border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold flex items-center gap-2">
              <Plus className="size-4 text-primary" />
              Add Event Mapping & Schema
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Register a new numeric telemetry event type, define its display details, and paste its generic payload contracts.
            </DialogDescription>
          </DialogHeader>

          {addError && (
            <div className="flex items-center gap-2 p-2.5 bg-destructive/10 border border-destructive/20 text-destructive rounded-md text-xs font-medium">
              <AlertTriangle className="size-3.5 shrink-0" />
              <span>{addError}</span>
            </div>
          )}

          <form onSubmit={handleAddMappingSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Event ID *</label>
                <input
                  type="number"
                  required
                  placeholder="E.g. 7"
                  value={newId}
                  onChange={(e) => setNewId(e.target.value)}
                  className="w-full h-8 px-3 rounded-md border border-border bg-background focus:outline-hidden focus:ring-1 focus:ring-ring/50 font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Event Name *</label>
                <input
                  type="text"
                  required
                  placeholder="E.g. BUFFER_START"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full h-8 px-3 rounded-md border border-border bg-background focus:outline-hidden focus:ring-1 focus:ring-ring/50 font-mono uppercase"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Description</label>
              <input
                type="text"
                placeholder="E.g. Triggered when client encounters buffering."
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="w-full h-8 px-3 rounded-md border border-border bg-background focus:outline-hidden focus:ring-1 focus:ring-ring/50"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="font-semibold text-foreground flex items-center gap-1">
                  <Braces className="size-3.5 text-muted-foreground" />
                  Generic Structure JSON
                </label>
                <textarea
                  placeholder='E.g. { "playhead_position": "int" }'
                  value={newGenericStructure}
                  onChange={(e) => setNewGenericStructure(e.target.value)}
                  className="w-full min-h-[140px] p-3 rounded-md border border-border bg-background focus:outline-hidden focus:ring-1 focus:ring-ring/50 font-mono resize-y"
                />
              </div>
              <div className="space-y-1.5">
                <label className="font-semibold text-foreground flex items-center gap-1">
                  <Code className="size-3.5 text-muted-foreground" />
                  Sample JSON
                </label>
                <textarea
                  placeholder='E.g. { "playhead_position": 912 }'
                  value={newSampleEvent}
                  onChange={(e) => setNewSampleEvent(e.target.value)}
                  className="w-full min-h-[140px] p-3 rounded-md border border-border bg-background focus:outline-hidden focus:ring-1 focus:ring-ring/50 font-mono resize-y"
                />
              </div>
            </div>

            <DialogFooter className="pt-3 gap-2">
              <DialogClose render={<Button variant="outline" type="button" />}>
                Cancel
              </DialogClose>
              <Button type="submit" className="cursor-pointer">
                Save Mapping
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Mapping Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl text-left bg-popover border border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold flex items-center gap-2">
              <BookOpen className="size-4 text-primary" />
              Edit Event Mapping Schema
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Modify details and payload contracts for this telemetry event mapping.
            </DialogDescription>
          </DialogHeader>

          {editError && (
            <div className="flex items-center gap-2 p-2.5 bg-destructive/10 border border-destructive/20 text-destructive rounded-md text-xs font-medium">
              <AlertTriangle className="size-3.5 shrink-0" />
              <span>{editError}</span>
            </div>
          )}

          <form onSubmit={handleEditMappingSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="font-semibold text-muted-foreground">Event ID (type - smallint - Read Only)</label>
                <input
                  type="number"
                  disabled
                  value={editId ?? ""}
                  className="w-full h-8 px-3 rounded-md border border-border bg-muted text-muted-foreground cursor-not-allowed font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Event Name *</label>
                <input
                  type="text"
                  required
                  placeholder="E.g. PLAY_START"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full h-8 px-3 rounded-md border border-border bg-background focus:outline-hidden focus:ring-1 focus:ring-ring/50 font-mono uppercase"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Description</label>
              <input
                type="text"
                placeholder="E.g. Triggered when client starts playback."
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                className="w-full h-8 px-3 rounded-md border border-border bg-background focus:outline-hidden focus:ring-1 focus:ring-ring/50"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="font-semibold text-foreground flex items-center gap-1">
                  <Braces className="size-3.5 text-muted-foreground" />
                  Generic Structure JSON
                </label>
                <textarea
                  placeholder='E.g. { "playhead_position": "int" }'
                  value={editGenericStructure}
                  onChange={(e) => setEditGenericStructure(e.target.value)}
                  className="w-full min-h-[140px] p-3 rounded-md border border-border bg-background focus:outline-hidden focus:ring-1 focus:ring-ring/50 font-mono resize-y"
                />
              </div>
              <div className="space-y-1.5">
                <label className="font-semibold text-foreground flex items-center gap-1">
                  <Code className="size-3.5 text-muted-foreground" />
                  Sample Event JSON Payload
                </label>
                <textarea
                  placeholder='E.g. { "playhead_position": 912 }'
                  value={editSampleEvent}
                  onChange={(e) => setEditSampleEvent(e.target.value)}
                  className="w-full min-h-[140px] p-3 rounded-md border border-border bg-background focus:outline-hidden focus:ring-1 focus:ring-ring/50 font-mono resize-y"
                />
              </div>
            </div>

            <DialogFooter className="pt-3 gap-2">
              <DialogClose render={<Button variant="outline" type="button" />}>
                Cancel
              </DialogClose>
              <Button type="submit" className="cursor-pointer">
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}
