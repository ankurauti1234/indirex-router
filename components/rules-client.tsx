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
  Sparkles,
  RefreshCw,
  Zap,
  Layers,
  Filter,
  Eye,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { PageContainer } from "./page-container"
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

export interface FieldConditionRule {
  id: string
  field: string
  operator: "equals" | "contains" | "not_equals" | "is_empty" | "gt" | "lt"
  value: string
  display_text: string
  badge_color?: "default" | "warning" | "destructive" | "success" | "info"
  enabled: boolean
}

export function RulesClient() {
  const supabase = createClient()
  const [dbEventTypes, setDbEventTypes] = React.useState<any[]>([])
  const [selectedSchemaType, setSelectedSchemaType] = React.useState<number>(1)
  const [activeSchemaTab, setActiveSchemaTab] = React.useState<"rules" | "generic" | "sample">("rules")
  
  // Template editing state
  const [editingType, setEditingType] = React.useState<number | null>(null)
  const [editTemplateVal, setEditTemplateVal] = React.useState("")
  const [isUpdating, setIsUpdating] = React.useState(false)

  // Field Rules state for selected schema
  const [fieldRules, setFieldRules] = React.useState<Record<number, FieldConditionRule[]>>({})

  // Form state to add new field condition rule
  const [showAddConditionForm, setShowAddConditionForm] = React.useState(false)
  const [newRuleField, setNewRuleField] = React.useState("content.title")
  const [newRuleOp, setNewRuleOp] = React.useState<FieldConditionRule["operator"]>("equals")
  const [newRuleVal, setNewRuleVal] = React.useState("unknown")
  const [newRuleDisplay, setNewRuleDisplay] = React.useState("Navigating...")
  const [newRuleBadge, setNewRuleBadge] = React.useState<FieldConditionRule["badge_color"]>("warning")

  // Copy success indicator
  const [copiedText, setCopiedText] = React.useState<string | null>(null)

  const fetchEventTypes = React.useCallback(async () => {
    try {
      const [typesRes, rulesRes] = await Promise.all([
        supabase.from("event_types").select("*").order("type", { ascending: true }),
        supabase.from("event_details_rules").select("*")
      ])

      const typesData = typesRes.data || []
      const rulesData = rulesRes.data || []

      if (!typesRes.error) {
        const rulesMap: Record<number, FieldConditionRule[]> = {}

        const combined = typesData.map((t: any) => {
          const rule = rulesData.find((r: any) => r.type_id === t.type)
          const descText = t.description || "No description set"
          const templateText = rule?.template || undefined

          // Extract field rules array from rule.field_rules or fallback to rule.structure._field_rules
          const extractedRules: FieldConditionRule[] = Array.isArray(rule?.field_rules)
            ? rule.field_rules
            : (Array.isArray(rule?.structure?._field_rules) ? rule.structure._field_rules : [])

          rulesMap[t.type] = extractedRules

          return {
            ...t,
            description: descText,
            template: templateText,
            structure: rule?.structure || null,
            sample: rule?.sample || null,
            field_rules: extractedRules
          }
        })

        setDbEventTypes(combined)
        setFieldRules(rulesMap)
      }
    } catch (e) {
      console.error("Error fetching event types and rules:", e)
    }
  }, [supabase])

  React.useEffect(() => {
    fetchEventTypes()
  }, [fetchEventTypes])

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedText(text)
    setTimeout(() => setCopiedText(null), 2000)
  }

  // Active event type data
  const currentActiveTypeObj = React.useMemo(() => {
    return dbEventTypes.find(t => t.type === selectedSchemaType)
  }, [dbEventTypes, selectedSchemaType])

  const activeFieldRules = React.useMemo(() => {
    return fieldRules[selectedSchemaType] || []
  }, [fieldRules, selectedSchemaType])

  // Save template and rules to Supabase
  const handleSaveTypeMetadata = async (typeId: number, newTemplate?: string, updatedRules?: FieldConditionRule[]) => {
    setIsUpdating(true)
    try {
      const targetType = dbEventTypes.find(t => t.type === typeId)
      const finalTemplate = newTemplate !== undefined ? newTemplate : (targetType?.template || "")
      const finalRules = updatedRules !== undefined ? updatedRules : (fieldRules[typeId] || [])

      const existingStruct = targetType?.structure || {}
      const payload: any = {
        type_id: typeId,
        template: finalTemplate.trim(),
        field_rules: finalRules,
        structure: {
          ...existingStruct,
          _field_rules: finalRules
        }
      }

      const { error } = await supabase
        .from("event_details_rules")
        .upsert(payload, { onConflict: "type_id" })

      if (error) {
        // Fallback if field_rules column does not exist yet on remote table
        delete payload.field_rules
        await supabase
          .from("event_details_rules")
          .upsert(payload, { onConflict: "type_id" })
      }

      await fetchEventTypes()
      setEditingType(null)
    } catch (e) {
      console.error(e)
    } finally {
      setIsUpdating(false)
    }
  }

  // Toggle condition rule enable state
  const handleToggleConditionRule = async (ruleId: string) => {
    const current = fieldRules[selectedSchemaType] || []
    const updated = current.map(r => r.id === ruleId ? { ...r, enabled: !r.enabled } : r)
    setFieldRules(prev => ({ ...prev, [selectedSchemaType]: updated }))
    await handleSaveTypeMetadata(selectedSchemaType, undefined, updated)
  }

  // Delete condition rule
  const handleDeleteConditionRule = async (ruleId: string) => {
    const current = fieldRules[selectedSchemaType] || []
    const updated = current.filter(r => r.id !== ruleId)
    setFieldRules(prev => ({ ...prev, [selectedSchemaType]: updated }))
    await handleSaveTypeMetadata(selectedSchemaType, undefined, updated)
  }

  // Add new condition rule
  const handleAddConditionRule = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newRuleField.trim() || !newRuleDisplay.trim()) return

    const newRule: FieldConditionRule = {
      id: `rule-${Date.now()}`,
      field: newRuleField.trim(),
      operator: newRuleOp,
      value: newRuleVal.trim(),
      display_text: newRuleDisplay.trim(),
      badge_color: newRuleBadge,
      enabled: true
    }

    const current = fieldRules[selectedSchemaType] || []
    const updated = [...current, newRule]
    setFieldRules(prev => ({ ...prev, [selectedSchemaType]: updated }))
    setShowAddConditionForm(false)
    await handleSaveTypeMetadata(selectedSchemaType, undefined, updated)
  }

  // Resolve current active schema information
  const activeSchemaMeta = React.useMemo(() => {
    return {
      description: currentActiveTypeObj?.description || "No description set",
      template: currentActiveTypeObj?.template || "",
      generic_structure: currentActiveTypeObj?.structure || {},
      sample_event: currentActiveTypeObj?.sample || {},
    }
  }, [currentActiveTypeObj])

  // Compute live output simulation preview using sample event & field rules
  const evaluatedSampleOutput = React.useMemo(() => {
    const sample = activeSchemaMeta.sample_event
    if (!sample || typeof sample !== "object") return "N/A"

    const template = activeSchemaMeta.template
    if (!template) return JSON.stringify(sample, null, 2)

    // Evaluate template interpolation with applied field rules
    let workingDetails = JSON.parse(JSON.stringify(sample))

    // Helper to evaluate value path
    const getValueByPath = (obj: any, pathStr: string) => {
      const parts = pathStr.split(".")
      let curr = obj
      for (const p of parts) {
        if (curr === null || curr === undefined) return undefined
        curr = curr[p]
      }
      return curr
    }

    const setValueByPath = (obj: any, pathStr: string, val: any) => {
      const parts = pathStr.split(".")
      let curr = obj
      for (let i = 0; i < parts.length - 1; i++) {
        if (!curr[parts[i]]) curr[parts[i]] = {}
        curr = curr[parts[i]]
      }
      curr[parts[parts.length - 1]] = val
    }

    // Apply active rules
    activeFieldRules.forEach(r => {
      if (!r.enabled) return
      const actualVal = getValueByPath(workingDetails, r.field)
      if (actualVal !== undefined) {
        const strVal = String(actualVal).trim().toLowerCase()
        const target = r.value.trim().toLowerCase()
        let match = false
        if (r.operator === "equals") match = strVal === target
        else if (r.operator === "not_equals") match = strVal !== target
        else if (r.operator === "contains") match = strVal.includes(target)
        else if (r.operator === "is_empty") match = strVal === "" || strVal === "null"
        else if (r.operator === "gt") match = Number(actualVal) > Number(r.value)
        else if (r.operator === "lt") match = Number(actualVal) < Number(r.value)

        if (match) {
          setValueByPath(workingDetails, r.field, r.display_text)
        }
      }
    })

    // Interpolate template
    return template.replace(/\{([\w.]+)\}/g, (_: string, path: string) => {
      const v = getValueByPath(workingDetails, path)
      return v !== undefined ? String(v) : `{${path}}`
    })
  }, [activeSchemaMeta, activeFieldRules])

  return (
    <PageContainer
      title="Rules & Telemetry Schemas"
      description="Configure event payload contract structures, define column template strings, and specify item-level conditional display rules."
    >
      {/* Main Grid: Left side schema directory, Right side schema workspace & rules editor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: Directory of Available Schemas */}
        <div className="lg:col-span-5 bg-card border border-border rounded-xl p-5 shadow-2xs space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Layers className="size-4 text-primary" />
              Event Schema Directory
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Select an event type below to inspect payload contracts and configure conditional item rules.
            </p>
          </div>

          <div className="space-y-3">
            {dbEventTypes.length === 0 ? (
              <div className="text-center py-8 font-mono text-xs text-muted-foreground border border-dashed rounded-lg">
                No active event mappings retrieved
              </div>
            ) : (
              dbEventTypes.map((t) => {
                const isSelected = selectedSchemaType === t.type
                const rulesCount = (fieldRules[t.type] || []).length

                return (
                  <div
                    key={t.type}
                    onClick={() => {
                      setSelectedSchemaType(t.type)
                      setEditingType(null)
                    }}
                    className={`p-4 border rounded-xl transition-all cursor-pointer ${
                      isSelected
                        ? "bg-primary/5 border-primary shadow-xs"
                        : "bg-muted/5 border-border/60 hover:bg-muted/10"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-semibold text-muted-foreground bg-muted border border-border/80 px-2 py-0.5 rounded">
                            Type {t.type}
                          </span>
                          <span className="font-semibold text-sm text-foreground font-mono">{t.name}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1.5">{t.description}</p>
                      </div>
                      <Sparkles className={`size-4 text-primary shrink-0 transition-opacity ${isSelected ? "opacity-100" : "opacity-0"}`} />
                    </div>

                    <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground/80 pt-2 border-t border-border/40 font-mono">
                      <span>Template: {t.template ? "Configured" : "None"}</span>
                      {rulesCount > 0 && (
                        <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[10px] font-medium">
                          {rulesCount} active rule{rulesCount > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Right Side: Interactive Schema Workspace & Advanced Item Rules */}
        <div className="lg:col-span-7 bg-card border border-border rounded-xl p-5 shadow-2xs space-y-5">
          {/* Header for selected type */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-primary/15 text-primary text-xs px-2 py-0.5 rounded font-mono font-bold">
                  Type {selectedSchemaType}
                </span>
                <h2 className="text-base font-bold text-foreground font-mono">
                  {currentActiveTypeObj?.name || `TYPE_${selectedSchemaType}`}
                </h2>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {activeSchemaMeta.description}
              </p>
            </div>

            {/* Navigation Tabs using ButtonGroup */}
            <ButtonGroup className="bg-muted/20 p-0.5 rounded-lg border border-border">
              <Button
                onClick={() => setActiveSchemaTab("rules")}
                variant={activeSchemaTab === "rules" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 text-xs cursor-pointer font-semibold gap-1.5"
              >
                <Zap className="size-3.5 text-primary" />
                <span>Field Rules</span>
              </Button>
              <Button
                onClick={() => setActiveSchemaTab("generic")}
                variant={activeSchemaTab === "generic" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 text-xs cursor-pointer font-semibold gap-1.5"
              >
                <Code className="size-3.5" />
                <span>Contract</span>
              </Button>
              <Button
                onClick={() => setActiveSchemaTab("sample")}
                variant={activeSchemaTab === "sample" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 text-xs cursor-pointer font-semibold gap-1.5"
              >
                <Eye className="size-3.5" />
                <span>Sample</span>
              </Button>
            </ButtonGroup>
          </div>

          {/* Template String Editor */}
          <div className="bg-muted/10 border border-border rounded-xl p-4 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <SlidersHorizontal className="size-3.5 text-primary" />
                Display Column Template (<code className="font-mono text-[11px] text-muted-foreground">details_column_template</code>)
              </span>
              {editingType !== selectedSchemaType && (
                <Button
                  onClick={() => {
                    setEditingType(selectedSchemaType)
                    setEditTemplateVal(activeSchemaMeta.template)
                  }}
                  variant="ghost"
                  size="sm"
                  className="text-primary hover:underline cursor-pointer flex items-center gap-1 font-semibold h-7 px-2 text-xs"
                >
                  <Edit3 className="size-3" />
                  Edit Template
                </Button>
              )}
            </div>

            {editingType === selectedSchemaType ? (
              <ButtonGroup className="w-full">
                <Input
                  type="text"
                  value={editTemplateVal}
                  onChange={(e) => setEditTemplateVal(e.target.value)}
                  placeholder="E.g. [content.platform] content.title"
                  className="h-8 text-xs font-mono bg-background"
                />
                <Button
                  onClick={() => handleSaveTypeMetadata(selectedSchemaType, editTemplateVal)}
                  disabled={isUpdating}
                  size="sm"
                  className="h-8 cursor-pointer font-semibold"
                >
                  {isUpdating ? <RefreshCw className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                  <span>Save</span>
                </Button>
                <Button
                  onClick={() => setEditingType(null)}
                  variant="outline"
                  size="sm"
                  className="h-8 cursor-pointer text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </Button>
              </ButtonGroup>
            ) : (
              <div className="font-mono text-xs bg-[#121212] border border-border p-2.5 rounded-lg text-zinc-300 select-all whitespace-pre-wrap break-all flex items-center justify-between">
                <span>{activeSchemaMeta.template || "-"}</span>
                <span className="text-[10px] text-zinc-500 font-sans">Interpolated format string</span>
              </div>
            )}
          </div>

          {/* TAB 1: Advanced Field-Level Conditional Rules Manager */}
          {activeSchemaTab === "rules" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Filter className="size-3.5 text-primary" />
                    Field-Level Item Conditions & Value Mappers
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Add conditional rules on specific payload items (e.g. if <code className="text-foreground font-mono">content.title = "unknown"</code> then display <span className="text-primary font-medium">"Navigating..."</span>).
                  </p>
                </div>

                <Button
                  onClick={() => setShowAddConditionForm(!showAddConditionForm)}
                  size="sm"
                  className="font-semibold cursor-pointer h-8 text-xs gap-1"
                >
                  <Plus className="size-3.5" />
                  <span>Add Condition</span>
                </Button>
              </div>

              {/* Form to add a new condition rule */}
              {showAddConditionForm && (
                <form onSubmit={handleAddConditionRule} className="border border-border bg-muted/15 rounded-xl p-4 space-y-3.5 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex justify-between items-center pb-2 border-b border-border/40">
                    <span className="text-xs font-bold text-foreground">
                      New Item Condition Rule for Type {selectedSchemaType}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowAddConditionForm(false)}
                      className="size-6 text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <X className="size-3.5" />
                    </Button>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-foreground">Target Field Path</label>
                      <input
                        type="text"
                        placeholder="E.g. content.title or reason"
                        value={newRuleField}
                        onChange={(e) => setNewRuleField(e.target.value)}
                        className="w-full bg-background border border-border rounded-md px-3 h-8 text-xs font-mono outline-hidden focus:ring-1 focus:ring-ring/50"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-foreground">Condition Operator</label>
                      <Select
                        value={newRuleOp}
                        onValueChange={(v) => setNewRuleOp(v as any)}
                      >
                        <SelectTrigger className="w-full h-8 text-xs cursor-pointer">
                          <SelectValue placeholder="Operator" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="equals">Equals (==)</SelectItem>
                          <SelectItem value="contains">Contains</SelectItem>
                          <SelectItem value="not_equals">Not Equals (!=)</SelectItem>
                          <SelectItem value="is_empty">Is Empty / Null</SelectItem>
                          <SelectItem value="gt">Greater Than (&gt;)</SelectItem>
                          <SelectItem value="lt">Less Than (&lt;)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-foreground">Matching Value</label>
                      <input
                        type="text"
                        placeholder="E.g. unknown or 0"
                        value={newRuleVal}
                        onChange={(e) => setNewRuleVal(e.target.value)}
                        className="w-full bg-background border border-border rounded-md px-3 h-8 text-xs font-mono outline-hidden focus:ring-1 focus:ring-ring/50"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-foreground">Display Output Override</label>
                      <input
                        type="text"
                        placeholder="E.g. Navigating... or Muted"
                        value={newRuleDisplay}
                        onChange={(e) => setNewRuleDisplay(e.target.value)}
                        className="w-full bg-background border border-border rounded-md px-3 h-8 text-xs outline-hidden focus:ring-1 focus:ring-ring/50 font-medium"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/40">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground">Badge Style:</span>
                      <Select
                        value={newRuleBadge}
                        onValueChange={(v) => setNewRuleBadge(v as any)}
                      >
                        <SelectTrigger className="w-28 h-7 text-xs cursor-pointer">
                          <SelectValue placeholder="Badge Color" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="warning">Warning (Yellow)</SelectItem>
                          <SelectItem value="info">Info (Blue)</SelectItem>
                          <SelectItem value="success">Success (Green)</SelectItem>
                          <SelectItem value="destructive">Alert (Red)</SelectItem>
                          <SelectItem value="default">Default (Gray)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAddConditionForm(false)}
                        className="h-7 text-xs cursor-pointer"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        size="sm"
                        className="h-7 text-xs cursor-pointer font-semibold"
                      >
                        Save Condition
                      </Button>
                    </div>
                  </div>
                </form>
              )}

              {/* Table of active field rules */}
              <div className="space-y-2.5">
                {activeFieldRules.length === 0 ? (
                  <div className="text-center p-8 border border-dashed rounded-xl text-muted-foreground text-xs font-mono">
                    No field condition rules defined for Type {selectedSchemaType}. Click "Add Condition" to create one.
                  </div>
                ) : (
                  activeFieldRules.map((rule) => (
                    <div
                      key={rule.id}
                      className="flex items-center justify-between p-3.5 border border-border rounded-xl bg-muted/5 hover:bg-muted/10 transition-colors gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono font-semibold text-foreground bg-muted border px-2 py-0.5 rounded">
                            if {rule.field} {rule.operator} "{rule.value}"
                          </span>
                          <span className="text-xs text-muted-foreground font-medium">➔</span>
                          <span className="text-xs font-bold text-foreground">
                            "{rule.display_text}"
                          </span>
                          {rule.badge_color && (
                            <span className={`text-xs font-mono px-2 py-0.5 rounded font-semibold uppercase ${
                              rule.badge_color === "warning" ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" :
                              rule.badge_color === "info" ? "bg-sky-500/10 text-sky-500 border border-sky-500/20" :
                              rule.badge_color === "success" ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" :
                              rule.badge_color === "destructive" ? "bg-rose-500/10 text-rose-500 border border-rose-500/20" :
                              "bg-muted text-muted-foreground border"
                            }`}>
                              {rule.badge_color}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          onClick={() => handleToggleConditionRule(rule.id)}
                          variant="ghost"
                          size="icon"
                          className="size-7 cursor-pointer"
                          title={rule.enabled ? "Rule is Active" : "Rule is Disabled"}
                        >
                          {rule.enabled ? (
                            <ToggleRight className="size-6 text-primary" />
                          ) : (
                            <ToggleLeft className="size-6 text-muted-foreground/40" />
                          )}
                        </Button>

                        <Button
                          onClick={() => handleDeleteConditionRule(rule.id)}
                          variant="ghost"
                          size="icon"
                          className="size-7 text-muted-foreground hover:text-destructive cursor-pointer"
                          title="Delete Rule"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Evaluated Live Output Banner */}
              <div className="mt-4 p-3.5 bg-muted/20 border border-border rounded-xl space-y-1">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                  <span>Evaluated Sample Row Output</span>
                  <span className="text-xs text-primary font-mono font-normal">Live Preview</span>
                </div>
                <div className="font-mono text-xs text-zinc-100 bg-[#121212] p-2.5 rounded-lg border border-border font-medium">
                  {evaluatedSampleOutput}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2 & 3: Generic Contract & Sample Inspector */}
          {(activeSchemaTab === "generic" || activeSchemaTab === "sample") && (
            <div className="relative group bg-[#121212] border border-border rounded-xl overflow-hidden flex flex-col min-h-[350px]">
              <Button
                onClick={() =>
                  handleCopy(
                    JSON.stringify(
                      activeSchemaTab === "generic"
                        ? activeSchemaMeta.generic_structure
                        : activeSchemaMeta.sample_event,
                      null,
                      2
                    )
                  )
                }
                variant="outline"
                size="icon"
                className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 size-7 bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-300 hover:text-white transition-all cursor-pointer shadow-sm z-10"
                title="Copy payload"
              >
                {copiedText ===
                JSON.stringify(
                  activeSchemaTab === "generic"
                    ? activeSchemaMeta.generic_structure
                    : activeSchemaMeta.sample_event,
                  null,
                  2
                ) ? (
                  <Check className="size-3.5 text-primary" />
                ) : (
                  <Copy className="size-3.5" />
                )}
              </Button>
              <div className="p-4 overflow-auto max-h-[480px] text-left">
                <pre className="text-xs text-zinc-100 font-mono leading-relaxed select-all whitespace-pre-wrap break-all pr-8">
                  {JSON.stringify(
                    activeSchemaTab === "generic"
                      ? activeSchemaMeta.generic_structure
                      : activeSchemaMeta.sample_event,
                    null,
                    2
                  ) || "{}"}
                </pre>
              </div>
            </div>
          )}
        </div>

      </div>
    </PageContainer>
  )
}
