"use client"

import * as React from "react"
import {
  SlidersHorizontal,
  Plus,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Check,
  Edit3,
  Code,
  X,
  Copy,
  RefreshCw,
  Zap,
  Layers,
  Filter,
  Eye,
  Search,
  FileCode,
  Activity,
  ArrowRight,
  Radio,
  Tv,
  Watch,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { findPlatformIconUrl } from "@/lib/platform-icons"
import { PageContainer } from "@/components/page-container"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { renderEventSummary, DynamicFieldRule } from "@/lib/template-formatter"
import { DEFAULT_ROUTER_EVENT_TYPES, formatRouterDetails } from "@/lib/router-event-defaults"
import { useTelemetryModeStore, TelemetryMode } from "@/lib/use-telemetry-mode-store"
import { cn } from "@/lib/utils"

export interface RuleEventType {
  type: number
  name: string
  description: string
  template?: string
  structure?: any
  sample?: any
  field_rules: DynamicFieldRule[]
}

interface UniversalRulesClientProps {
  forcedMode?: TelemetryMode
}

export function UniversalRulesClient({ forcedMode }: UniversalRulesClientProps) {
  const { mode: storeMode } = useTelemetryModeStore()
  const activeMode = forcedMode || storeMode
  const isRouter = activeMode === "router"
  const isWearable = activeMode === "wearable"

  const supabase = createClient()
  const [eventTypes, setEventTypes] = React.useState<RuleEventType[]>([])
  const [selectedType, setSelectedType] = React.useState<number>(1)
  const [activeTab, setActiveTab] = React.useState<"rules" | "generic" | "sample">("rules")
  const [searchQuery, setSearchQuery] = React.useState("")

  const [editingTemplate, setEditingTemplate] = React.useState(false)
  const [editTemplateVal, setEditTemplateVal] = React.useState("")
  const [isUpdating, setIsUpdating] = React.useState(false)
  const [copiedText, setCopiedText] = React.useState<string | null>(null)

  // Add rule state
  const [showAddRule, setShowAddRule] = React.useState(false)
  const [newRuleField, setNewRuleField] = React.useState("device_details.event")
  const [newRuleOp, setNewRuleOp] = React.useState<DynamicFieldRule["operator"]>("equals")
  const [newRuleVal, setNewRuleVal] = React.useState("connected")
  const [newRuleDisplay, setNewRuleDisplay] = React.useState("Device Connected")
  const [newRuleBadge, setNewRuleBadge] = React.useState<DynamicFieldRule["badge_color"]>("success")

  const loadData = React.useCallback(async () => {
    try {
      if (isWearable) {
        const res = await fetch("/api/wearable-event-types", { cache: "no-store" })
        if (res.ok) {
          const json = await res.json()
          if (json.success && Array.isArray(json.eventTypes)) {
            setEventTypes(json.eventTypes)
            if (json.eventTypes.length > 0 && !json.eventTypes.some((t: any) => t.type === selectedType)) {
              setSelectedType(json.eventTypes[0].type)
            }
            return
          }
        }
      } else if (isRouter) {
        const res = await fetch("/api/router-rules", { cache: "no-store" })
        if (res.ok) {
          const json = await res.json()
          if (json.success && Array.isArray(json.eventTypes)) {
            setEventTypes(json.eventTypes)
            if (json.eventTypes.length > 0 && !json.eventTypes.some((t: any) => t.type === selectedType)) {
              setSelectedType(json.eventTypes[0].type)
            }
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
        const combined: RuleEventType[] = typesData.map((t: any) => {
          const rule = rulesData.find((r: any) => r.type_id === t.type)
          const fieldRules: DynamicFieldRule[] = Array.isArray(rule?.field_rules)
            ? rule.field_rules
            : (Array.isArray(rule?.structure?._field_rules) ? rule.structure._field_rules : [])

          return {
            type: t.type,
            name: t.name || `TYPE_${t.type}`,
            description: t.description || "",
            template: rule?.template || undefined,
            structure: rule?.structure || {},
            sample: rule?.sample || {},
            field_rules: fieldRules,
          }
        })
        setEventTypes(combined)
        if (combined.length > 0 && !combined.some((t) => t.type === selectedType)) {
          setSelectedType(combined[0].type)
        }
      }
    } catch (e) {
      console.warn("Failed loading rules:", e)
    }
  }, [isRouter, selectedType, supabase])

  React.useEffect(() => {
    loadData()
  }, [loadData])

  const activeMeta = React.useMemo(() => {
    return eventTypes.find((t) => t.type === selectedType) || eventTypes[0]
  }, [eventTypes, selectedType])

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedText(text)
    setTimeout(() => setCopiedText(null), 2000)
  }

  // Save Template & Rules to Backend DB
  const handleSaveTypeRules = async (typeId: number, newTemplate?: string, updatedRules?: DynamicFieldRule[]) => {
    setIsUpdating(true)
    try {
      const target = eventTypes.find((t) => t.type === typeId)
      const finalTemplate = newTemplate !== undefined ? newTemplate : (target?.template || "")
      const finalRules = updatedRules !== undefined ? updatedRules : (target?.field_rules || [])

      // Optimistic update
      setEventTypes((prev) =>
        prev.map((t) => (t.type === typeId ? { ...t, template: finalTemplate, field_rules: finalRules } : t))
      )

      if (isRouter) {
        await fetch("/api/router-rules", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            typeId,
            template: finalTemplate.trim(),
            fieldRules: finalRules,
          }),
        })
      } else {
        const payload: any = {
          type_id: typeId,
          template: finalTemplate.trim(),
          field_rules: finalRules,
          structure: {
            ...(target?.structure || {}),
            _field_rules: finalRules,
          },
        }
        await supabase.from("event_details_rules").upsert(payload, { onConflict: "type_id" })
      }

      setEditingTemplate(false)
    } catch (e) {
      console.error("Failed saving rules:", e)
    } finally {
      setIsUpdating(false)
    }
  }

  // Toggle rule enabled status
  const handleToggleRule = async (ruleId: string) => {
    if (!activeMeta) return
    const updated = (activeMeta.field_rules || []).map((r) =>
      r.id === ruleId ? { ...r, enabled: !r.enabled } : r
    )
    await handleSaveTypeRules(activeMeta.type, undefined, updated)
  }

  // Delete rule
  const handleDeleteRule = async (ruleId: string) => {
    if (!activeMeta) return
    const updated = (activeMeta.field_rules || []).map((r) => r).filter((r) => r.id !== ruleId)
    await handleSaveTypeRules(activeMeta.type, undefined, updated)
  }

  // Add rule submit
  const handleAddCondition = async () => {
    if (!activeMeta || !newRuleField.trim() || !newRuleVal.trim() || !newRuleDisplay.trim()) return

    const newRule: DynamicFieldRule = {
      id: `rule-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      field: newRuleField.trim(),
      operator: newRuleOp,
      value: newRuleVal.trim(),
      display_text: newRuleDisplay.trim(),
      badge_color: newRuleBadge,
      enabled: true,
    }

    const updated = [...(activeMeta.field_rules || []), newRule]
    await handleSaveTypeRules(activeMeta.type, undefined, updated)

    setShowAddRule(false)
    setNewRuleField(isRouter ? "device_details.event" : "content.title")
    setNewRuleVal(isRouter ? "connected" : "live")
    setNewRuleDisplay(isRouter ? "Device Connected" : "Live Streaming")
  }

  // Evaluated live preview summary
  const livePreview = React.useMemo(() => {
    if (!activeMeta) return ""
    return (
      renderEventSummary(activeMeta.sample, activeMeta.template, activeMeta.field_rules) ||
      (isRouter ? formatRouterDetails(activeMeta.sample, activeMeta.type, null, activeMeta.template, activeMeta.field_rules) : "-")
    )
  }, [activeMeta, isRouter])

  // Filtered types in sidebar
  const filteredTypes = React.useMemo(() => {
    if (!searchQuery.trim()) return eventTypes
    const s = searchQuery.toLowerCase().trim()
    return eventTypes.filter((t) => t.name.toLowerCase().includes(s) || String(t.type).includes(s))
  }, [eventTypes, searchQuery])

  return (
    <PageContainer
      title="Rules Engine"
      description={
        <div className="flex items-center gap-2 flex-wrap">
          <span>
            {isWearable
              ? "Configure acoustic watermark matching rules, carrier heartbeat templates, and Wi-Fi status payloads."
              : isRouter
              ? "Configure detail string formatting templates, custom badge rules, and inspect payload schemas for Router telemetry."
              : "Configure dynamic display templates, badge evaluation rules, and payload schemas for SDK playback events."}
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
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full items-start">
        
        {/* Left Column: Event Types Selector */}
        <div className="lg:col-span-4 border border-border bg-card rounded-lg shadow-2xs overflow-hidden flex flex-col">
          <div className="p-3 border-b border-border bg-muted/20 space-y-2 select-none">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <SlidersHorizontal className="size-3.5 text-primary" />
                Event Types ({eventTypes.length})
              </span>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={loadData}>
                <RefreshCw className="size-3" />
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search types..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-8 text-xs bg-card"
              />
            </div>
          </div>

          <div className="divide-y divide-border/60 max-h-[580px] overflow-y-auto">
            {filteredTypes.map((t) => {
              const isSelected = selectedType === t.type
              const ruleCount = (t.field_rules || []).length
              return (
                <button
                  key={t.type}
                  type="button"
                  onClick={() => {
                    setSelectedType(t.type)
                    setEditingTemplate(false)
                    setShowAddRule(false)
                  }}
                  className={cn(
                    "w-full text-left p-3 flex items-start justify-between gap-2 text-xs transition-colors cursor-pointer",
                    isSelected ? "bg-primary/10 border-l-3 border-primary" : "hover:bg-muted/40"
                  )}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-primary text-[11px]">{t.type}</span>
                      <span className="font-semibold text-foreground truncate">{t.name}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{t.description}</p>
                  </div>
                  {ruleCount > 0 && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-muted text-muted-foreground border border-border shrink-0">
                      {ruleCount} {ruleCount === 1 ? "rule" : "rules"}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Right Column: Template & Rule Details */}
        {activeMeta ? (
          <div className="lg:col-span-8 space-y-4">
            
            {/* Template Card */}
            <div className="p-4 bg-card border border-border rounded-lg shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-border/60 pb-2">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Display String Formatting Template
                  </span>
                  <h3 className="text-sm font-bold text-foreground font-mono">
                    {activeMeta.name} (Type {activeMeta.type})
                  </h3>
                </div>
                {!editingTemplate && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => {
                      setEditTemplateVal(activeMeta.template || "")
                      setEditingTemplate(true)
                    }}
                  >
                    <Edit3 className="size-3" />
                    Edit Template
                  </Button>
                )}
              </div>

              {editingTemplate ? (
                <div className="space-y-2">
                  <Input
                    value={editTemplateVal}
                    onChange={(e) => setEditTemplateVal(e.target.value)}
                    placeholder="e.g. [{device_details.iface}] connected: {device_details.hostname}"
                    className="text-xs font-mono"
                  />
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      className="h-7 text-xs font-semibold"
                      disabled={isUpdating}
                      onClick={() => handleSaveTypeRules(activeMeta.type, editTemplateVal)}
                    >
                      Save Template
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setEditingTemplate(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-2.5 bg-muted/40 border border-border rounded-md font-mono text-xs text-foreground/90">
                  {activeMeta.template || "<No template defined — using intelligent fallback>"}
                </div>
              )}

              {/* Live Preview */}
              <div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block mb-1">
                  Live Evaluated Output (Sample Event)
                </span>
                <div className="p-2.5 bg-muted/20 border border-border rounded-md font-mono text-[11px] text-primary">
                  {livePreview}
                </div>
              </div>
            </div>

            {/* Condition Rules Section */}
            <div className="p-4 bg-card border border-border rounded-lg shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-border/60 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Condition Rules & Badges
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                    {(activeMeta.field_rules || []).length}
                  </span>
                </div>
                {!showAddRule && (
                  <Button
                    size="sm"
                    className="h-7 text-xs gap-1 font-semibold"
                    onClick={() => setShowAddRule(true)}
                  >
                    <Plus className="size-3" />
                    Add Condition Rule
                  </Button>
                )}
              </div>

              {/* Inline Add Rule Form */}
              {showAddRule && (
                <div className="p-3 bg-muted/40 border border-border rounded-lg space-y-3 text-xs animate-in fade-in duration-150">
                  <div className="font-semibold text-xs text-foreground flex items-center justify-between">
                    <span>New Condition Rule</span>
                    <button type="button" onClick={() => setShowAddRule(false)}>
                      <X className="size-3.5 text-muted-foreground hover:text-foreground" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-0.5">
                        Field Path (dot notation)
                      </label>
                      <Input
                        value={newRuleField}
                        onChange={(e) => setNewRuleField(e.target.value)}
                        placeholder="e.g. device_details.event"
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-0.5">
                        Operator
                      </label>
                      <Select value={newRuleOp} onValueChange={(val: any) => setNewRuleOp(val)}>
                        <SelectTrigger className="h-8 text-xs bg-card">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="text-xs">
                          <SelectItem value="equals">equals (==)</SelectItem>
                          <SelectItem value="contains">contains</SelectItem>
                          <SelectItem value="not_equals">not equals (!=)</SelectItem>
                          <SelectItem value="gt">greater than (&gt;)</SelectItem>
                          <SelectItem value="lt">less than (&lt;)</SelectItem>
                          <SelectItem value="is_empty">is empty / null</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-0.5">
                        Target Value
                      </label>
                      <Input
                        value={newRuleVal}
                        onChange={(e) => setNewRuleVal(e.target.value)}
                        placeholder="e.g. connected"
                        className="h-8 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-0.5">
                        Badge Display Text
                      </label>
                      <Input
                        value={newRuleDisplay}
                        onChange={(e) => setNewRuleDisplay(e.target.value)}
                        placeholder="e.g. Device Connected"
                        className="h-8 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-0.5">
                        Badge Color
                      </label>
                      <Select value={newRuleBadge} onValueChange={(val: any) => setNewRuleBadge(val)}>
                        <SelectTrigger className="h-8 text-xs bg-card">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="text-xs">
                          <SelectItem value="success">Success (Green)</SelectItem>
                          <SelectItem value="info">Info (Blue)</SelectItem>
                          <SelectItem value="warning">Warning (Amber)</SelectItem>
                          <SelectItem value="destructive">Destructive (Red)</SelectItem>
                          <SelectItem value="default">Default (Slate)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <Button size="sm" className="h-7 text-xs font-semibold" onClick={handleAddCondition}>
                      Save Condition Rule
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowAddRule(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Rules Table */}
              <div className="divide-y divide-border/60 border border-border rounded-lg bg-card overflow-hidden text-xs">
                {(activeMeta.field_rules || []).length > 0 ? (
                  (activeMeta.field_rules || []).map((rule) => (
                    <div key={rule.id} className="p-3 flex items-center justify-between gap-3 hover:bg-muted/30">
                      <div className="flex items-center gap-2 min-w-0">
                        <button
                          type="button"
                          onClick={() => handleToggleRule(rule.id)}
                          className="text-muted-foreground hover:text-foreground cursor-pointer"
                          title={rule.enabled ? "Disable Rule" : "Enable Rule"}
                        >
                          {rule.enabled ? (
                            <ToggleRight className="size-5 text-emerald-500" />
                          ) : (
                            <ToggleLeft className="size-5 text-muted-foreground/40" />
                          )}
                        </button>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono font-bold text-foreground text-[11px]">{rule.field}</span>
                            <span className="text-[10px] text-muted-foreground font-mono">{rule.operator}</span>
                            <span className="px-1 py-0.2 rounded bg-muted font-mono text-[10px] text-foreground">
                              {rule.value}
                            </span>
                            <ArrowRight className="size-3 text-muted-foreground" />
                            <span
                              className={cn(
                                "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border",
                                rule.badge_color === "success" && "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
                                rule.badge_color === "warning" && "bg-amber-500/10 text-amber-600 border-amber-500/30",
                                rule.badge_color === "destructive" && "bg-rose-500/10 text-rose-600 border-rose-500/30",
                                rule.badge_color === "info" && "bg-sky-500/10 text-sky-600 border-sky-500/30",
                                (!rule.badge_color || rule.badge_color === "default") && "bg-muted text-muted-foreground border-border"
                              )}
                            >
                              {rule.display_text}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeleteRule(rule.id)}
                        title="Delete Condition Rule"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-xs text-muted-foreground">
                    No custom condition rules defined for this event type.
                  </div>
                )}
              </div>
            </div>

            {/* Schema & Sample Payload Tabs */}
            <div className="p-4 bg-card border border-border rounded-lg shadow-2xs space-y-3">
              <div className="flex items-center gap-1 border-b border-border pb-1">
                <Button
                  variant={activeTab === "rules" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 text-xs font-semibold"
                  onClick={() => setActiveTab("rules")}
                >
                  Generic Schema
                </Button>
                <Button
                  variant={activeTab === "sample" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 text-xs font-semibold"
                  onClick={() => setActiveTab("sample")}
                >
                  Sample Event Payload
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 text-[10px] ml-auto gap-1"
                  onClick={() =>
                    handleCopy(
                      JSON.stringify(activeTab === "sample" ? activeMeta.sample : activeMeta.structure, null, 2)
                    )
                  }
                >
                  {copiedText ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
                  {copiedText ? "Copied" : "Copy JSON"}
                </Button>
              </div>

              <pre className="p-3 bg-muted/50 border border-border rounded-md font-mono text-[11px] overflow-x-auto max-h-56 whitespace-pre-wrap">
                {JSON.stringify(activeTab === "sample" ? activeMeta.sample : activeMeta.structure, null, 2)}
              </pre>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-8 p-12 text-center text-xs text-muted-foreground border border-dashed border-border rounded-lg bg-card">
            Select an event type from the left list to inspect formatting templates and condition rules.
          </div>
        )}
      </div>
    </PageContainer>
  )
}

