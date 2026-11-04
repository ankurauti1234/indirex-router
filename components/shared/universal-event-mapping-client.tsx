"use client"

import * as React from "react"
import {
  Search,
  RefreshCw,
  Copy,
  Check,
  Plus,
  Edit3,
  Tv,
  Radio,
  Watch,
  X,
  Code,
  FileCode,
} from "lucide-react"
import { PageContainer } from "@/components/page-container"
import { createClient } from "@/lib/supabase/client"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { useTelemetryModeStore, TelemetryMode } from "@/lib/use-telemetry-mode-store"

export interface EventMappingItem {
  id: number
  name: string
  description: string
  template?: string
  structure?: any
  sample?: any
}

interface UniversalEventMappingClientProps {
  forcedMode?: TelemetryMode
}

export function UniversalEventMappingClient({ forcedMode }: UniversalEventMappingClientProps) {
  const { mode: storeMode, setMode: setStoreMode } = useTelemetryModeStore()
  const activeMode = forcedMode || storeMode
  const isRouter = activeMode === "router"
  const isWearable = activeMode === "wearable"

  const supabase = createClient()
  const [mappings, setMappings] = React.useState<EventMappingItem[]>([])
  const [selectedMapping, setSelectedMapping] = React.useState<EventMappingItem | null>(null)
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const [copiedText, setCopiedText] = React.useState<string | null>(null)

  // Search
  const [searchTerm, setSearchTerm] = React.useState("")
  const [searchField, setSearchField] = React.useState<"name" | "id">("name")

  // Add Dialog
  const [isAddOpen, setIsAddOpen] = React.useState(false)
  const [newId, setNewId] = React.useState("")
  const [newName, setNewName] = React.useState("")
  const [newDesc, setNewDesc] = React.useState("")
  const [newTemplate, setNewTemplate] = React.useState("")
  const [newStructure, setNewStructure] = React.useState("")
  const [newSample, setNewSample] = React.useState("")
  const [addError, setAddError] = React.useState("")

  // Edit Dialog
  const [isEditOpen, setIsEditOpen] = React.useState(false)
  const [editId, setEditId] = React.useState<number | null>(null)
  const [editName, setEditName] = React.useState("")
  const [editDesc, setEditDesc] = React.useState("")
  const [editTemplate, setEditTemplate] = React.useState("")
  const [editError, setEditError] = React.useState("")

  const loadData = React.useCallback(async () => {
    try {
      if (isWearable) {
        const res = await fetch("/api/wearable-event-types", { cache: "no-store" })
        if (res.ok) {
          const json = await res.json()
          if (json.success && Array.isArray(json.eventTypes)) {
            setMappings(
              json.eventTypes.map((d: any) => ({
                id: d.type,
                name: d.name || `TYPE_${d.type}`,
                description: d.description || "",
                template: d.template || "[{details}]",
                structure: d.structure || {},
                sample: d.sample || {},
              })).sort((a: any, b: any) => a.id - b.id)
            )
            return
          }
        }
      } else if (isRouter) {
        const res = await fetch("/api/router-event-types", { cache: "no-store" })
        if (res.ok) {
          const list = await res.json()
          if (Array.isArray(list)) {
            setMappings(
              list.map((d: any) => ({
                id: d.type,
                name: d.name || `TYPE_${d.type}`,
                description: d.description || "",
                template: d.template || "[{details}]",
                structure: d.structure || {},
                sample: d.sample || {},
              })).sort((a, b) => a.id - b.id)
            )
            return
          }
        }
      } else {
        // SDK mode: load event_types and event_details_rules
        const [typesRes, rulesRes] = await Promise.all([
          supabase.from("event_types").select("*").order("type", { ascending: true }),
          supabase.from("event_details_rules").select("*"),
        ])

        const typesData = typesRes.data || []
        const rulesData = rulesRes.data || []
        const formatted: EventMappingItem[] = typesData.map((t: any) => {
          const rule = rulesData.find((r: any) => r.type_id === t.type)
          return {
            id: t.type,
            name: t.name || `TYPE_${t.type}`,
            description: t.description || "",
            template: rule?.template || undefined,
            structure: rule?.structure || null,
            sample: rule?.sample || null,
          }
        })
        setMappings(formatted.sort((a, b) => a.id - b.id))
      }
    } catch (e) {
      console.warn("Failed loading event types:", e)
    }
  }, [isRouter, supabase])

  React.useEffect(() => {
    loadData()
  }, [loadData])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await loadData()
    setTimeout(() => setIsRefreshing(false), 500)
  }

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedText(text)
    setTimeout(() => setCopiedText(null), 2000)
  }

  // Create Mapping Handler
  const handleCreateMapping = async () => {
    setAddError("")
    const typeNum = parseInt(newId, 10)
    if (isNaN(typeNum)) {
      setAddError("Type ID must be a valid integer")
      return
    }
    if (!newName.trim()) {
      setAddError("Event Type Name is required")
      return
    }

    let structObj = undefined
    if (newStructure.trim()) {
      try {
        structObj = JSON.parse(newStructure)
      } catch {
        setAddError("Structure must be a valid JSON object")
        return
      }
    }

    let sampleObj = undefined
    if (newSample.trim()) {
      try {
        sampleObj = JSON.parse(newSample)
      } catch {
        setAddError("Sample must be a valid JSON object")
        return
      }
    }

    try {
      if (isRouter) {
        const res = await fetch("/api/router-event-types", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: typeNum,
            name: newName.trim().toUpperCase(),
            description: newDesc.trim(),
            template: newTemplate.trim() || undefined,
            structure: structObj,
            sample: sampleObj,
          }),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          setAddError(err.error || "Failed to create event type")
          return
        }
      } else {
        const { error: typeErr } = await supabase.from("event_types").insert({
          type: typeNum,
          name: newName.trim().toUpperCase(),
          description: newDesc.trim() || "No description set",
          created_at: new Date().toISOString(),
        })
        if (typeErr) {
          setAddError(typeErr.message)
          return
        }

        if (newTemplate.trim() || structObj || sampleObj) {
          await supabase.from("event_details_rules").insert({
            type_id: typeNum,
            template: newTemplate.trim() || null,
            structure: structObj || null,
            sample: sampleObj || null,
          })
        }
      }

      await loadData()
      setIsAddOpen(false)
      setNewId("")
      setNewName("")
      setNewDesc("")
      setNewTemplate("")
      setNewStructure("")
      setNewSample("")
    } catch (e: any) {
      setAddError(e.message || "Failed to create event type")
    }
  }

  // Edit Mapping Handler
  const handleEditMapping = async () => {
    setEditError("")
    if (editId === null) return
    if (!editName.trim()) {
      setEditError("Name is required")
      return
    }

    try {
      if (isRouter) {
        const res = await fetch("/api/router-event-types", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: editId,
            name: editName.trim().toUpperCase(),
            description: editDesc.trim(),
            template: editTemplate.trim() || undefined,
          }),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          setEditError(err.error || "Failed to update event type")
          return
        }
      } else {
        await supabase
          .from("event_types")
          .update({
            name: editName.trim().toUpperCase(),
            description: editDesc.trim(),
          })
          .eq("type", editId)

        if (editTemplate.trim()) {
          await supabase
            .from("event_details_rules")
            .upsert({ type_id: editId, template: editTemplate.trim() }, { onConflict: "type_id" })
        }
      }

      await loadData()
      setIsEditOpen(false)
    } catch (e: any) {
      setEditError(e.message || "Failed to update event type")
    }
  }

  // Filtered Mappings
  const filteredMappings = React.useMemo(() => {
    if (!searchTerm.trim()) return mappings
    const s = searchTerm.toLowerCase().trim()
    return mappings.filter((m) => {
      if (searchField === "id") return String(m.id).includes(s)
      return m.name.toLowerCase().includes(s) || m.description.toLowerCase().includes(s)
    })
  }, [mappings, searchTerm, searchField])

  return (
    <PageContainer
      title="Event Mapping"
      description={
        <div className="flex items-center gap-2 flex-wrap">
          <span>
            {isWearable
              ? "Define payload schemas, templates, and samples for acoustic watermark and wearable telemetry types."
              : isRouter
              ? "Define payload schemas, templates, and samples for hardware router telemetry types."
              : "Define payload schemas, formatting templates, and field rules for SDK playback events."}
          </span>
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
        </div>
      }
    >
      <div className="flex flex-col gap-3 min-w-0">
        
        {/* Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-card border border-border rounded-lg shadow-2xs text-xs">
          <div className="flex items-center flex-1 min-w-[260px] sm:min-w-[320px] rounded-md border border-border bg-background focus-within:ring-1 focus-within:ring-primary focus-within:border-primary transition-all shadow-2xs">
            <Select value={searchField} onValueChange={(val: any) => setSearchField(val)}>
              <SelectTrigger className="h-8 text-xs w-[125px] shrink-0 border-0 border-r border-border rounded-r-none bg-muted/30 font-medium focus:ring-0 shadow-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="text-xs">
                <SelectItem value="name">Type Name</SelectItem>
                <SelectItem value="id">Type ID</SelectItem>
              </SelectContent>
            </Select>

            <div className="relative flex-1 flex items-center">
              <Search className="absolute left-2.5 size-3.5 text-muted-foreground pointer-events-none" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={`Search ${searchField === "name" ? "by type name or description..." : "by type ID..."}`}
                className="h-8 pl-8 pr-8 text-xs border-0 rounded-l-none focus-visible:ring-0 shadow-none bg-transparent"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
                  title="Clear search"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button size="sm" className="h-8 text-xs gap-1.5 font-semibold" onClick={() => setIsAddOpen(true)}>
              <Plus className="size-3.5" />
              <span>Add Event Type</span>
            </Button>
            <Button variant="outline" size="sm" className="h-8 px-2.5" onClick={handleRefresh} title="Refresh">
              <RefreshCw className={cn("size-3.5", isRefreshing && "animate-spin")} />
            </Button>
          </div>
        </div>

        {/* Mappings Table */}
        <div className="border border-border bg-card rounded-lg overflow-hidden shadow-2xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-[11px] font-bold text-muted-foreground uppercase select-none">
                <th className="py-2.5 px-3 w-20">Type ID</th>
                <th className="py-2.5 px-3 w-48">Type Name</th>
                <th className="py-2.5 px-3">Description</th>
                <th className="py-2.5 px-3 w-64">Display Template</th>
                <th className="py-2.5 px-3 w-20 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredMappings.length > 0 ? (
                filteredMappings.map((m) => {
                  const isSelected = selectedMapping?.id === m.id
                  return (
                    <tr
                      key={m.id}
                      onClick={() => setSelectedMapping(m)}
                      className={cn(
                        "hover:bg-muted/30 cursor-pointer transition-colors",
                        isSelected && "bg-primary/5 font-medium"
                      )}
                    >
                      <td className="py-2.5 px-3 font-mono font-bold text-primary">{m.id}</td>
                      <td className="py-2.5 px-3 font-semibold text-foreground">{m.name}</td>
                      <td className="py-2.5 px-3 text-muted-foreground">{m.description || "—"}</td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-foreground/80 truncate max-w-xs">
                        {m.template || "—"}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={(e) => {
                            e.stopPropagation()
                            setEditId(m.id)
                            setEditName(m.name)
                            setEditDesc(m.description)
                            setEditTemplate(m.template || "")
                            setIsEditOpen(true)
                          }}
                          title="Edit Event Type"
                        >
                          <Edit3 className="size-3.5" />
                        </Button>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-xs text-muted-foreground">
                    No event types found matching search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Selected Schema Inspector Drawer */}
        {selectedMapping && (
          <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] bg-card border-l border-border shadow-2xl p-5 flex flex-col gap-4 overflow-y-auto animate-in slide-in-from-right duration-200">
            <div className="flex items-start justify-between border-b border-border pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Schema & Sample Inspector
                </span>
                <h3 className="text-base font-bold text-foreground font-mono mt-0.5">
                  {selectedMapping.name} ({selectedMapping.id})
                </h3>
              </div>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setSelectedMapping(null)}>
                <X className="size-4" />
              </Button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <span className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">
                  Formatting Template
                </span>
                <div className="p-2.5 bg-muted/40 border border-border rounded-md font-mono text-[11px]">
                  {selectedMapping.template || "Default token format"}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">
                    Generic Payload Structure
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 text-[10px] gap-1"
                    onClick={() => handleCopyText(JSON.stringify(selectedMapping.structure, null, 2))}
                  >
                    <Copy className="size-3" />
                    Copy
                  </Button>
                </div>
                <pre className="p-3 bg-muted/50 border border-border rounded-md font-mono text-[11px] overflow-x-auto max-h-56 whitespace-pre-wrap">
                  {JSON.stringify(selectedMapping.structure, null, 2)}
                </pre>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">
                    Sample Event JSON
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 text-[10px] gap-1"
                    onClick={() => handleCopyText(JSON.stringify(selectedMapping.sample, null, 2))}
                  >
                    <Copy className="size-3" />
                    Copy
                  </Button>
                </div>
                <pre className="p-3 bg-muted/50 border border-border rounded-md font-mono text-[11px] text-emerald-600 dark:text-emerald-400 overflow-x-auto max-h-56 whitespace-pre-wrap">
                  {JSON.stringify(selectedMapping.sample, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* Add Dialog */}
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Event Type ({isRouter ? "Router" : "SDK"})</DialogTitle>
              <DialogDescription>
                Register a new event code in {isRouter ? "router_event_types" : "event_types"} table.
              </DialogDescription>
            </DialogHeader>

            {addError && (
              <div className="p-2.5 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded">
                {addError}
              </div>
            )}

            <div className="space-y-3 py-2 text-xs">
              <div>
                <label className="font-semibold block mb-1">Type ID (smallint)</label>
                <Input placeholder="e.g. 15" value={newId} onChange={(e) => setNewId(e.target.value)} />
              </div>
              <div>
                <label className="font-semibold block mb-1">Type Name</label>
                <Input placeholder="e.g. BANDWIDTH_LIMIT" value={newName} onChange={(e) => setNewName(e.target.value)} />
              </div>
              <div>
                <label className="font-semibold block mb-1">Description</label>
                <Input placeholder="Event purpose summary" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
              </div>
              <div>
                <label className="font-semibold block mb-1">Display Template (Optional)</label>
                <Input placeholder="[{field}] message • {other}" value={newTemplate} onChange={(e) => setNewTemplate(e.target.value)} />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateMapping}>Save Event Type</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Event Type ({editId})</DialogTitle>
              <DialogDescription>Update event definition in database.</DialogDescription>
            </DialogHeader>

            {editError && (
              <div className="p-2.5 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded">
                {editError}
              </div>
            )}

            <div className="space-y-3 py-2 text-xs">
              <div>
                <label className="font-semibold block mb-1">Type Name</label>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
              </div>
              <div>
                <label className="font-semibold block mb-1">Description</label>
                <Input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} />
              </div>
              <div>
                <label className="font-semibold block mb-1">Display Template</label>
                <Input value={editTemplate} onChange={(e) => setEditTemplate(e.target.value)} />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
              <Button onClick={handleEditMapping}>Update Event Type</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageContainer>
  )
}

