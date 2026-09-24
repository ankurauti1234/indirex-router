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
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { findPlatformIconUrl } from "@/lib/platform-icons"
import { PageContainer } from "./page-container"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  RouterFieldRule,
  RouterEventTypeMeta,
} from "@/lib/router-event-defaults"

const LOCAL_STORAGE_RULES_KEY = "indirex_router_rules_meta"

export function RouterRulesClient() {
  const supabase = createClient()
  const [eventTypes, setEventTypes] = React.useState<RouterEventTypeMeta[]>(DEFAULT_ROUTER_EVENT_TYPES)
  const [selectedSchemaType, setSelectedSchemaType] = React.useState<number>(1)
  const [activeSchemaTab, setActiveSchemaTab] = React.useState<"rules" | "generic" | "sample">("rules")
  const [schemaSearchQuery, setSchemaSearchQuery] = React.useState("")
  
  const [editingType, setEditingType] = React.useState<number | null>(null)
  const [editTemplateVal, setEditTemplateVal] = React.useState("")
  const [isUpdating, setIsUpdating] = React.useState(false)

  const [fieldRulesMap, setFieldRulesMap] = React.useState<Record<number, RouterFieldRule[]>>({})

  const [showAddConditionForm, setShowAddConditionForm] = React.useState(false)
  const [newRuleField, setNewRuleField] = React.useState("device_details.event")
  const [newRuleOp, setNewRuleOp] = React.useState<RouterFieldRule["operator"]>("equals")
  const [newRuleVal, setNewRuleVal] = React.useState("connected")
  const [newRuleDisplay, setNewRuleDisplay] = React.useState("Device Connected")
  const [newRuleBadge, setNewRuleBadge] = React.useState<RouterFieldRule["badge_color"]>("success")

  const [copiedText, setCopiedText] = React.useState<string | null>(null)

  const loadRules = React.useCallback(async () => {
    let savedLocal: Record<number, { template?: string; field_rules?: RouterFieldRule[] }> = {}
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_RULES_KEY)
      if (stored) savedLocal = JSON.parse(stored)
    } catch (e) {
      console.error(e)
    }

    const { data: dbTypes } = await supabase.from("router_event_types").select("*")
    const dbMap = new Map(dbTypes?.map((t: any) => [t.type, t]) || [])

    const rulesStateMap: Record<number, RouterFieldRule[]> = {}

    const updatedTypes = DEFAULT_ROUTER_EVENT_TYPES.map(def => {
      const localMeta = savedLocal[def.type]
      const dbItem = dbMap.get(def.type)

      const finalRules = localMeta?.field_rules !== undefined ? localMeta.field_rules : def.field_rules
      rulesStateMap[def.type] = finalRules

      return {
        ...def,
        name: dbItem?.name || def.name,
        description: dbItem?.description || def.description,
        template: localMeta?.template !== undefined ? localMeta.template : def.template,
        field_rules: finalRules,
      }
    })

    setEventTypes(updatedTypes)
    setFieldRulesMap(rulesStateMap)
  }, [supabase])

  React.useEffect(() => {
    loadRules()
  }, [loadRules])

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedText(text)
    setTimeout(() => setCopiedText(null), 2000)
  }

  const activeTypeMeta = React.useMemo(() => {
    return eventTypes.find(t => t.type === selectedSchemaType) || eventTypes[0]
  }, [eventTypes, selectedSchemaType])

  const activeRules = React.useMemo(() => {
    return fieldRulesMap[selectedSchemaType] || []
  }, [fieldRulesMap, selectedSchemaType])

  const filteredEventTypes = React.useMemo(() => {
    if (!schemaSearchQuery.trim()) return eventTypes
    const q = schemaSearchQuery.toLowerCase()
    return eventTypes.filter(
      t =>
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.type.toString().includes(q)
    )
  }, [eventTypes, schemaSearchQuery])

  const handleSaveTypeRules = async (typeId: number, newTemplate?: string, updatedRules?: RouterFieldRule[]) => {
    setIsUpdating(true)
    try {
      const targetType = eventTypes.find(t => t.type === typeId)
      const finalTemplate = newTemplate !== undefined ? newTemplate : (targetType?.template || "")
      const finalRules = updatedRules !== undefined ? updatedRules : (fieldRulesMap[typeId] || [])

      const stored = localStorage.getItem(LOCAL_STORAGE_RULES_KEY)
      const parsed = stored ? JSON.parse(stored) : {}
      parsed[typeId] = {
        template: finalTemplate.trim(),
        field_rules: finalRules,
      }
      localStorage.setItem(LOCAL_STORAGE_RULES_KEY, JSON.stringify(parsed))

      setEventTypes(prev =>
        prev.map(t => (t.type === typeId ? { ...t, template: finalTemplate.trim(), field_rules: finalRules } : t))
      )
      setFieldRulesMap(prev => ({ ...prev, [typeId]: finalRules }))
      setEditingType(null)
    } catch (e) {
      console.error(e)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleToggleRule = async (ruleId: string) => {
    const current = fieldRulesMap[selectedSchemaType] || []
    const updated = current.map(r => (r.id === ruleId ? { ...r, enabled: !r.enabled } : r))
    await handleSaveTypeRules(selectedSchemaType, undefined, updated)
  }

  const handleDeleteRule = async (ruleId: string) => {
    const current = fieldRulesMap[selectedSchemaType] || []
    const updated = current.filter(r => r.id !== ruleId)
    await handleSaveTypeRules(selectedSchemaType, undefined, updated)
  }

  const handleAddConditionRule = async () => {
    if (!newRuleField.trim() || !newRuleVal.trim() || !newRuleDisplay.trim()) return

    const newRule: RouterFieldRule = {
      id: `rule-router-${Date.now()}`,
      field: newRuleField.trim(),
      operator: newRuleOp,
      value: newRuleVal.trim(),
      display_text: newRuleDisplay.trim(),
      badge_color: newRuleBadge,
      enabled: true,
    }

    const current = fieldRulesMap[selectedSchemaType] || []
    const updated = [...current, newRule]
    await handleSaveTypeRules(selectedSchemaType, undefined, updated)

    setShowAddConditionForm(false)
    setNewRuleField("device_details.event")
    setNewRuleVal("connected")
    setNewRuleDisplay("Device Connected")
  }

  const livePreviewSummary = React.useMemo(() => {
    if (!activeTypeMeta) return ""
    return formatRouterDetails(
      activeTypeMeta.sample,
      activeTypeMeta.type,
      activeTypeMeta.type === 4 ? "01" : null,
      activeTypeMeta.template,
      activeRules
    )
  }, [activeTypeMeta, activeRules])

  return (
    <PageContainer
      title="Router Event Rules & Schemas"
      description="Configure detail string formatting templates, custom badge condition rules, and view payload schemas across all Router Event Types."
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full items-start">
        <div className="lg:col-span-4 border border-border bg-card rounded-lg shadow-2xs overflow-hidden flex flex-col">
          <div className="p-3 border-b border-border bg-muted/20 space-y-2 select-none">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Radio className="size-3.5 text-primary" />
                Router Event Types ({eventTypes.length})
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={loadRules}
                className="h-6 text-[11px] gap-1 text-muted-foreground"
              >
                <RefreshCw className="size-3" />
                Reset
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-2 size-3.5 text-muted-foreground" />
              <Input
                placeholder="Search event type..."
                value={schemaSearchQuery}
                onChange={(e) => setSchemaSearchQuery(e.target.value)}
                className="h-8 pl-8 text-xs bg-background"
              />
            </div>
          </div>

          <div className="divide-y divide-border max-h-[600px] overflow-y-auto">
            {filteredEventTypes.map((t) => {
              const isSelected = selectedSchemaType === t.type
              const ruleCount = (fieldRulesMap[t.type] || []).length

              return (
                <button
                  key={t.type}
                  onClick={() => {
                    setSelectedSchemaType(t.type)
                    setEditingType(null)
                  }}
                  className={`w-full text-left p-3 text-xs transition-colors flex items-center justify-between ${
                    isSelected
                      ? "bg-primary/10 border-l-4 border-l-primary text-foreground font-semibold"
                      : "hover:bg-muted/40 text-muted-foreground"
                  }`}
                >
                  <div className="space-y-0.5 truncate pr-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-primary text-xs bg-primary/10 px-1.5 py-0.5 rounded">
                        TYPE {t.type}
                      </span>
                      <span className="font-semibold text-foreground truncate">{t.name}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground/80 truncate font-sans">
                      {t.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 font-mono text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border">
                    <Filter className="size-3 text-muted-foreground" />
                    <span>{ruleCount}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <div className="lg:col-span-8 border border-border bg-card rounded-lg shadow-2xs overflow-hidden flex flex-col">
          <div className="p-4 border-b border-border bg-muted/10 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-primary/10 text-primary text-xs font-mono font-bold px-2 py-0.5 rounded border border-primary/20">
                  TYPE {activeTypeMeta.type}
                </span>
                <h3 className="font-bold text-base text-foreground">
                  {activeTypeMeta.name}
                </h3>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 font-sans">
                {activeTypeMeta.description}
              </p>
            </div>

            <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-md border border-border text-xs">
              <button
                onClick={() => setActiveSchemaTab("rules")}
                className={`px-3 py-1 rounded font-medium transition-colors ${
                  activeSchemaTab === "rules" ? "bg-background text-foreground shadow-2xs font-semibold" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Rules & Template
              </button>
              <button
                onClick={() => setActiveSchemaTab("generic")}
                className={`px-3 py-1 rounded font-medium transition-colors ${
                  activeSchemaTab === "generic" ? "bg-background text-foreground shadow-2xs font-semibold" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Structure Schema
              </button>
              <button
                onClick={() => setActiveSchemaTab("sample")}
                className={`px-3 py-1 rounded font-medium transition-colors ${
                  activeSchemaTab === "sample" ? "bg-background text-foreground shadow-2xs font-semibold" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Sample Payload
              </button>
            </div>
          </div>

          {activeSchemaTab === "rules" && (
            <div className="p-4 space-y-6 text-xs">
              <div className="p-4 border border-border rounded-lg bg-muted/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileCode className="size-4 text-primary" />
                    <span className="font-bold text-xs uppercase tracking-wider text-foreground">
                      Summary Display Template
                    </span>
                  </div>
                  {editingType !== activeTypeMeta.type ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditTemplateVal(activeTypeMeta.template || "")
                        setEditingType(activeTypeMeta.type)
                      }}
                      className="h-7 text-xs gap-1"
                    >
                      <Edit3 className="size-3" />
                      Edit Template
                    </Button>
                  ) : (
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        onClick={() => handleSaveTypeRules(activeTypeMeta.type, editTemplateVal)}
                        disabled={isUpdating}
                        className="h-7 text-xs gap-1 bg-primary text-primary-foreground"
                      >
                        <Check className="size-3" />
                        Save
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingType(null)}
                        className="h-7 text-xs"
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>

                {editingType === activeTypeMeta.type ? (
                  <div className="space-y-2">
                    <Input
                      value={editTemplateVal}
                      onChange={(e) => setEditTemplateVal(e.target.value)}
                      className="font-mono text-xs bg-background"
                      placeholder="e.g. [{domain_activity.platform}] {domain_activity.domain}"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Use <code className="bg-muted px-1 rounded">{"{path.to.key}"}</code> bindings for variable extraction.
                    </p>
                  </div>
                ) : (
                  <div className="font-mono text-xs p-2.5 bg-background border border-border rounded font-medium text-foreground">
                    {activeTypeMeta.template || "-"}
                  </div>
                )}

                <div className="pt-2 border-t border-border/60">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <Eye className="size-3 text-primary" />
                    Live Rendered Preview
                  </span>
                  <div className="mt-1 p-2 bg-background border border-border/80 rounded font-mono text-xs font-semibold text-foreground flex items-center gap-2">
                    <span>{livePreviewSummary}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Filter className="size-4 text-primary" />
                    <span className="font-bold text-xs uppercase tracking-wider text-foreground">
                      Field Condition Rules ({activeRules.length})
                    </span>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setShowAddConditionForm(prev => !prev)}
                    className="h-7 text-xs gap-1 bg-primary text-primary-foreground"
                  >
                    <Plus className="size-3" />
                    Add Condition Rule
                  </Button>
                </div>

                {showAddConditionForm && (
                  <div className="p-3 bg-muted/30 border border-primary/30 rounded-lg space-y-3 animate-in fade-in duration-150">
                    <span className="font-bold text-xs text-foreground block">
                      Create New Condition Rule for TYPE {activeTypeMeta.type}
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div>
                        <label className="text-[11px] text-muted-foreground block mb-0.5">Field Path</label>
                        <Input
                          value={newRuleField}
                          onChange={(e) => setNewRuleField(e.target.value)}
                          placeholder="e.g. device_details.iface"
                          className="h-8 font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-muted-foreground block mb-0.5">Operator</label>
                        <Select
                          value={newRuleOp}
                          onValueChange={(val) => setNewRuleOp(val as any)}
                        >
                          <SelectTrigger className="h-8 text-xs font-mono bg-background">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="equals">equals</SelectItem>
                            <SelectItem value="not_equals">not_equals</SelectItem>
                            <SelectItem value="contains">contains</SelectItem>
                            <SelectItem value="is_empty">is_empty</SelectItem>
                            <SelectItem value="gt">greater than (gt)</SelectItem>
                            <SelectItem value="lt">less than (lt)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-[11px] text-muted-foreground block mb-0.5">Target Value</label>
                        <Input
                          value={newRuleVal}
                          onChange={(e) => setNewRuleVal(e.target.value)}
                          placeholder="e.g. ra0"
                          className="h-8 font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-muted-foreground block mb-0.5">Display Text</label>
                        <Input
                          value={newRuleDisplay}
                          onChange={(e) => setNewRuleDisplay(e.target.value)}
                          placeholder="e.g. 2.4GHz Wi-Fi"
                          className="h-8 font-sans"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAddConditionForm(false)}
                        className="h-7 text-xs"
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleAddConditionRule}
                        className="h-7 text-xs bg-primary text-primary-foreground"
                      >
                        Save Rule
                      </Button>
                    </div>
                  </div>
                )}

                <div className="divide-y divide-border border border-border rounded-lg bg-card overflow-hidden">
                  {activeRules.length === 0 ? (
                    <div className="p-6 text-center text-muted-foreground font-sans">
                      No custom field rules defined for this event type.
                    </div>
                  ) : (
                    activeRules.map((rule) => (
                      <div
                        key={rule.id}
                        className={`p-3 flex items-center justify-between text-xs transition-colors font-mono ${
                          rule.enabled ? "bg-card" : "bg-muted/30 text-muted-foreground"
                        }`}
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={() => handleToggleRule(rule.id)}
                            className="text-muted-foreground hover:text-foreground"
                            title={rule.enabled ? "Disable Rule" : "Enable Rule"}
                          >
                            {rule.enabled ? (
                              <ToggleRight className="size-5 text-primary" />
                            ) : (
                              <ToggleLeft className="size-5 text-muted-foreground" />
                            )}
                          </button>
                          <span className="bg-muted px-1.5 py-0.5 rounded border border-border/80 text-foreground font-semibold">
                            {rule.field}
                          </span>
                          <span className="text-muted-foreground">{rule.operator}</span>
                          <span className="bg-muted px-1.5 py-0.5 rounded border border-border/80 text-foreground">
                            "{rule.value}"
                          </span>
                          <ArrowRight className="size-3 text-muted-foreground" />
                          <span className="font-bold text-primary font-sans bg-primary/10 border border-primary/20 px-2 py-0.5 rounded">
                            {rule.display_text}
                          </span>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteRule(rule.id)}
                          className="size-7 text-muted-foreground hover:text-destructive shrink-0"
                          title="Delete Rule"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {activeSchemaTab === "generic" && (
            <div className="p-4 space-y-3 text-xs font-mono">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground font-sans font-semibold">
                  JSON Structure Definition for TYPE {activeTypeMeta.type}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopy(JSON.stringify(activeTypeMeta.structure, null, 2))}
                  className="h-7 text-xs gap-1.5"
                >
                  <Copy className="size-3" />
                  Copy Schema
                </Button>
              </div>
              <pre className="p-4 bg-muted/60 border border-border rounded-lg overflow-x-auto whitespace-pre-wrap text-foreground">
                {JSON.stringify(activeTypeMeta.structure, null, 2)}
              </pre>
            </div>
          )}

          {activeSchemaTab === "sample" && (
            <div className="p-4 space-y-3 text-xs font-mono">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground font-sans font-semibold">
                  Sample Event Payload for TYPE {activeTypeMeta.type}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopy(JSON.stringify(activeTypeMeta.sample, null, 2))}
                  className="h-7 text-xs gap-1.5"
                >
                  <Copy className="size-3" />
                  Copy Sample
                </Button>
              </div>
              <pre className="p-4 bg-muted/60 border border-border rounded-lg overflow-x-auto whitespace-pre-wrap text-emerald-600 dark:text-emerald-400">
                {JSON.stringify(
                  {
                    device_id: "RM0008",
                    sub_device_id: activeTypeMeta.type === 4 ? "01" : null,
                    type: activeTypeMeta.type,
                    timestamp: "2026-09-24T11:25:14+00:00",
                    details: activeTypeMeta.sample,
                  },
                  null,
                  2
                )}
              </pre>
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  )
}

