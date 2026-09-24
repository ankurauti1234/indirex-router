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
  Radio,
  Edit3,
  Zap,
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
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  ButtonGroup,
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
  RouterEventTypeMeta,
} from "@/lib/router-event-defaults"

export interface RouterEventTypeMapping extends RouterEventTypeMeta {
  created_at?: string
  is_active?: boolean
}

export function RouterEventTypesClient() {
  const { selectedTimezone } = useTimezoneStore()
  const [types, setTypes] = React.useState<RouterEventTypeMapping[]>(DEFAULT_ROUTER_EVENT_TYPES)
  const [selectedMapping, setSelectedMapping] = React.useState<RouterEventTypeMapping | null>(null)

  const [stagedSearchTerm, setStagedSearchTerm] = React.useState("")
  const [stagedSearchField, setStagedSearchField] = React.useState<"name" | "id">("name")

  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false)
  const [newId, setNewId] = React.useState("")
  const [newName, setNewName] = React.useState("")
  const [newDesc, setNewDesc] = React.useState("")
  const [addError, setAddError] = React.useState("")

  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false)
  const [editId, setEditId] = React.useState<number | null>(null)
  const [editName, setEditName] = React.useState("")
  const [editDesc, setEditDesc] = React.useState("")
  const [editError, setEditError] = React.useState("")

  const [visibleColumns, setVisibleColumns] = React.useState({
    id: true,
    name: true,
    description: true,
    template: true,
  })

  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const [copiedText, setCopiedText] = React.useState<string | null>(null)

  const supabase = createClient()

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedText(text)
    setTimeout(() => setCopiedText(null), 2000)
  }

  const [colWidths, setColWidths] = React.useState<Record<string, number>>({
    id: 110,
    name: 220,
    description: 380,
    template: 350,
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

  const fetchTypesData = React.useCallback(async () => {
    try {
      const res = await fetch("/api/router-event-types")
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data) && data.length > 0) {
          const dbMap = new Map(data.map((d: any) => [d.type, d]))
          const combined: RouterEventTypeMapping[] = DEFAULT_ROUTER_EVENT_TYPES.map(def => {
            const dbItem = dbMap.get(def.type)
            return {
              ...def,
              name: dbItem?.name || def.name,
              description: dbItem?.description || def.description,
            }
          })

          data.forEach((d: any) => {
            if (!DEFAULT_ROUTER_EVENT_TYPES.some(def => def.type === d.type)) {
              combined.push({
                type: d.type,
                name: d.name || `TYPE_${d.type}`,
                description: d.description || "Custom router event type",
                template: "[{details}]",
                structure: {},
                sample: {},
                field_rules: [],
              })
            }
          })

          combined.sort((a, b) => a.type - b.type)
          setTypes(combined)
          return
        }
      }
    } catch (apiErr) {
      console.warn("API route /api/router-event-types failed, falling back to direct client Supabase query:", apiErr)
    }

    try {
      const { data, error } = await supabase.from("router_event_types").select("*").order("type", { ascending: true })
      
      if (!error && data) {
        const dbMap = new Map(data.map((d: any) => [d.type, d]))
        const combined: RouterEventTypeMapping[] = DEFAULT_ROUTER_EVENT_TYPES.map(def => {
          const dbItem = dbMap.get(def.type)
          return {
            ...def,
            name: dbItem?.name || def.name,
            description: dbItem?.description || def.description,
          }
        })

        data.forEach((d: any) => {
          if (!DEFAULT_ROUTER_EVENT_TYPES.some(def => def.type === d.type)) {
            combined.push({
              type: d.type,
              name: d.name || `TYPE_${d.type}`,
              description: d.description || "Custom router event type",
              template: "[{details}]",
              structure: {},
              sample: {},
              field_rules: [],
            })
          }
        })

        combined.sort((a, b) => a.type - b.type)
        setTypes(combined)
      }
    } catch (e) {
      console.error("Failed fetching router_event_types:", e)
    }
  }, [supabase])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetchTypesData()
    setTimeout(() => setIsRefreshing(false), 600)
  }

  React.useEffect(() => {
    fetchTypesData()
  }, [fetchTypesData])

  const filteredTypes = React.useMemo(() => {
    if (!stagedSearchTerm.trim()) return types

    const term = stagedSearchTerm.toLowerCase().trim()
    return types.filter(t => {
      if (stagedSearchField === "id") {
        return String(t.type).includes(term)
      }
      return (
        t.name.toLowerCase().includes(term) ||
        t.description.toLowerCase().includes(term)
      )
    })
  }, [types, stagedSearchTerm, stagedSearchField])

  const handleCreateMapping = async () => {
    setAddError("")
    const typeNum = parseInt(newId, 10)
    if (isNaN(typeNum)) {
      setAddError("Type ID must be a valid integer")
      return
    }
    if (!newName.trim()) {
      setAddError("Name is required")
      return
    }

    try {
      const { error } = await supabase.from("router_event_types").upsert({
        type: typeNum,
        name: newName.trim().toUpperCase(),
        description: newDesc.trim(),
      })

      if (error) {
        setAddError(error.message)
        return
      }

      await fetchTypesData()
      setIsAddDialogOpen(false)
      setNewId("")
      setNewName("")
      setNewDesc("")
    } catch (e: any) {
      setAddError(e.message || "Failed to create event type")
    }
  }

  const handleEditMapping = async () => {
    setEditError("")
    if (editId === null) return

    try {
      const { error } = await supabase.from("router_event_types").upsert({
        type: editId,
        name: editName.trim().toUpperCase(),
        description: editDesc.trim(),
      })

      if (error) {
        setEditError(error.message)
        return
      }

      await fetchTypesData()
      setIsEditDialogOpen(false)
    } catch (e: any) {
      setEditError(e.message || "Failed to update event type")
    }
  }

  const openEditDialog = (t: RouterEventTypeMapping) => {
    setEditId(t.type)
    setEditName(t.name)
    setEditDesc(t.description)
    setIsEditDialogOpen(true)
  }

  return (
    <PageContainer
      title="Router Event Types"
      description="View and configure router telemetry event type definitions (`router_event_types` table), schemas, and rendering templates."
    >
      <div className="flex flex-col border border-border bg-card rounded-lg shadow-2xs overflow-hidden w-full min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-muted/5 border-b border-border text-xs select-none">
          <div className="flex flex-wrap items-center gap-2">
            <ButtonGroup className="h-8">
              <Select
                value={stagedSearchField}
                onValueChange={(val) => setStagedSearchField(val as any)}
              >
                <SelectTrigger className="h-8 text-xs font-mono font-medium bg-background border border-border border-r-0 rounded-r-none text-foreground px-2.5">
                  <Search className="size-3.5 text-muted-foreground mr-1" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name / Description</SelectItem>
                  <SelectItem value="id">Type ID</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder={`Search by ${stagedSearchField}...`}
                value={stagedSearchTerm}
                onChange={(e) => setStagedSearchTerm(e.target.value)}
                className="h-8 text-xs bg-background border-l-0 rounded-l-none rounded-r-md w-60"
              />
            </ButtonGroup>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              className="h-8 size-8 border-border"
              title="Refresh types from Supabase"
            >
              <RefreshCw className={isRefreshing ? "animate-spin size-3.5" : "size-3.5"} />
            </Button>

            <Button
              onClick={() => {
                setAddError("")
                setIsAddDialogOpen(true)
              }}
              size="sm"
              className="h-8 text-xs px-3 bg-primary text-primary-foreground font-medium gap-1.5"
            >
              <Plus className="size-3.5" />
              Add Event Type
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-muted-foreground font-semibold uppercase text-[10px] tracking-wider select-none">
                {visibleColumns.id && (
                  <th style={{ width: colWidths.id }} className="p-2.5 pl-3 relative group">
                    <div className="flex items-center justify-between">
                      <span>Type ID</span>
                      <div
                        onMouseDown={(e) => handleColumnResize(e, "id")}
                        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50 group-hover:bg-border"
                      />
                    </div>
                  </th>
                )}
                {visibleColumns.name && (
                  <th style={{ width: colWidths.name }} className="p-2.5 relative group">
                    <div className="flex items-center justify-between">
                      <span>Type Name</span>
                      <div
                        onMouseDown={(e) => handleColumnResize(e, "name")}
                        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50 group-hover:bg-border"
                      />
                    </div>
                  </th>
                )}
                {visibleColumns.description && (
                  <th style={{ width: colWidths.description }} className="p-2.5 relative group">
                    <div className="flex items-center justify-between">
                      <span>Description</span>
                      <div
                        onMouseDown={(e) => handleColumnResize(e, "description")}
                        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50 group-hover:bg-border"
                      />
                    </div>
                  </th>
                )}
                {visibleColumns.template && (
                  <th style={{ width: colWidths.template }} className="p-2.5 pr-3 relative group">
                    <div className="flex items-center justify-between">
                      <span>Summary Template</span>
                      <div
                        onMouseDown={(e) => handleColumnResize(e, "template")}
                        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50 group-hover:bg-border"
                      />
                    </div>
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredTypes.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-muted-foreground">
                    No router event types match your search criteria.
                  </td>
                </tr>
              ) : (
                filteredTypes.map((t) => {
                  const isSelected = selectedMapping?.type === t.type
                  return (
                    <tr
                      key={t.type}
                      onClick={() => setSelectedMapping(t)}
                      className={`hover:bg-muted/40 cursor-pointer transition-colors font-mono ${
                        isSelected ? "bg-muted/70 font-semibold" : ""
                      }`}
                    >
                      {visibleColumns.id && (
                        <td className="p-2.5 pl-3">
                          <span className="font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded text-xs">
                            {t.type}
                          </span>
                        </td>
                      )}
                      {visibleColumns.name && (
                        <td className="p-2.5 font-bold text-foreground">
                          {t.name}
                        </td>
                      )}
                      {visibleColumns.description && (
                        <td className="p-2.5 text-muted-foreground font-sans truncate">
                          {t.description}
                        </td>
                      )}
                      {visibleColumns.template && (
                        <td className="p-2.5 pr-3 text-muted-foreground text-[11px] truncate">
                          <code className="bg-muted px-1.5 py-0.5 rounded border border-border/60">
                            {t.template}
                          </code>
                        </td>
                      )}
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="p-3 bg-muted/10 border-t border-border text-xs text-muted-foreground font-mono flex items-center justify-between">
          <span>Total Event Types: {filteredTypes.length}</span>
          <span>Click any row to inspect details schema & sample payload</span>
        </div>
      </div>

      {selectedMapping && (
        <div className="fixed inset-y-0 right-0 w-full sm:w-[540px] bg-card border-l border-border shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-200">
          <div className="flex items-center justify-between p-4 border-b border-border bg-muted/10">
            <div className="flex items-center gap-2">
              <Zap className="size-5 text-primary" />
              <div>
                <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                  <span>TYPE {selectedMapping.type}: {selectedMapping.name}</span>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {selectedMapping.description}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => openEditDialog(selectedMapping)}
                className="h-7 text-xs gap-1"
              >
                <Edit3 className="size-3" />
                Edit
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedMapping(null)}
                className="size-8 text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs font-mono">
            <div className="space-y-1.5">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider font-sans">
                Summary Template String
              </span>
              <div className="p-3 bg-muted/40 border border-border rounded-lg text-foreground font-mono font-medium">
                {selectedMapping.template}
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider font-sans">
                  Payload Structure Definition
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopyText(JSON.stringify(selectedMapping.structure, null, 2))}
                  className="h-6 text-[11px] gap-1"
                >
                  <Copy className="size-3" />
                  Copy
                </Button>
              </div>
              <pre className="p-3 bg-muted/60 border border-border rounded-lg text-xs overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(selectedMapping.structure, null, 2)}
              </pre>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider font-sans">
                  Sample Event JSON
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopyText(JSON.stringify(selectedMapping.sample, null, 2))}
                  className="h-6 text-[11px] gap-1"
                >
                  <Copy className="size-3" />
                  Copy Sample
                </Button>
              </div>
              <pre className="p-3 bg-muted/60 border border-border rounded-lg text-xs overflow-x-auto whitespace-pre-wrap text-emerald-600 dark:text-emerald-400">
                {JSON.stringify(selectedMapping.sample, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Router Event Type</DialogTitle>
            <DialogDescription>
              Create a new router event type in `router_event_types` table.
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
              <Input
                placeholder="e.g. 12"
                value={newId}
                onChange={(e) => setNewId(e.target.value)}
              />
            </div>
            <div>
              <label className="font-semibold block mb-1">Type Name</label>
              <Input
                placeholder="e.g. SYSTEM_HEALTH"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div>
              <label className="font-semibold block mb-1">Description</label>
              <Input
                placeholder="Brief summary of event purpose"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateMapping}>
              Save Event Type
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Router Event Type ({editId})</DialogTitle>
            <DialogDescription>
              Update definition in `router_event_types` table.
            </DialogDescription>
          </DialogHeader>

          {editError && (
            <div className="p-2.5 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded">
              {editError}
            </div>
          )}

          <div className="space-y-3 py-2 text-xs">
            <div>
              <label className="font-semibold block mb-1">Type Name</label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div>
              <label className="font-semibold block mb-1">Description</label>
              <Input
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditMapping}>
              Update Event Type
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}

