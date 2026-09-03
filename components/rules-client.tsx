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
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { PageContainer } from "./page-container"
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
  const [schemaSearchQuery, setSchemaSearchQuery] = React.useState("")
  
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

  // Filtered directory items
  const filteredEventTypes = React.useMemo(() => {
    if (!schemaSearchQuery.trim()) return dbEventTypes
    const q = schemaSearchQuery.toLowerCase()
    return dbEventTypes.filter(
      t =>
        t.name?.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        t.type.toString().includes(q)
    )
  }, [dbEventTypes, schemaSearchQuery])

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

    let workingDetails = JSON.parse(JSON.stringify(sample))

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

    return template.replace(/\{([\w.]+)\}/g, (_: string, path: string) => {
      const v = getValueByPath(workingDetails, path)
      return v !== undefined ? String(v) : `{${path}}`
    })
  }, [activeSchemaMeta, activeFieldRules])

  return (
    <PageContainer
      title="Rules & Telemetry Schemas"
      description={
        <span className="flex flex-wrap gap-2 items-center">
          <span>Configure event payload contract structures, define column template strings, and specify item-level conditional display rules.</span>
        </span>
      }
    >
      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: Directory of Available Schemas */}
        <div className="lg:col-span-5 bg-card border border-border rounded-lg p-4 shadow-2xs space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5 font-mono">
                <Layers className="size-3.5 text-primary" />
                Schema Directory
              </h2>
              <span className="text-[11px] text-muted-foreground font-mono">
                {filteredEventTypes.length} types
              </span>
            </div>
            
            {/* Search Filter for Schemas */}
            <div className="relative">
              <Search className="size-3.5 text-muted-foreground/60 absolute left-2.5 top-2.5" />
              <Input
                type="text"
                placeholder="Filter event schemas..."
                value={schemaSearchQuery}
                onChange={(e) => setSchemaSearchQuery(e.target.value)}
                className="h-8 text-xs pl-8 bg-background border-border"
              />
              {schemaSearchQuery && (
                <button
                  onClick={() => setSchemaSearchQuery("")}
                  className="absolute right-2.5 top-2 text-muted-foreground hover:text-foreground p-0.5"
                >
                  <X className="size-3" />
                </button>
              )}
            </div>
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto custom-scrollbar pr-1">
            {filteredEventTypes.length === 0 ? (
              <div className="text-center py-8 font-mono text-xs text-muted-foreground border border-dashed rounded-lg bg-muted/10">
                No matching schemas found
              </div>
            ) : (
              filteredEventTypes.map((t) => {
                const isSelected = selectedSchemaType === t.type
                const rulesCount = (fieldRules[t.type] || []).length

                return (
                  <div
                    key={t.type}
                    onClick={() => {
                      setSelectedSchemaType(t.type)
                      setEditingType(null)
                    }}
                    className={`p-3 border rounded-md transition-all cursor-pointer select-none ${
                      isSelected
                        ? "bg-primary/5 border-primary border-l-4 shadow-2xs"
                        : "bg-card border-border/60 hover:bg-muted/30"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-[10px] font-bold text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded">
                            TYPE {t.type}
                          </span>
                          <span className="font-semibold text-xs text-foreground font-mono truncate">{t.name}</span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-1">{t.description}</p>
                      </div>
                    </div>

                    <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground pt-2 border-t border-border/40 font-mono">
                      <span>Template: {t.template ? "Configured" : "None"}</span>
                      {rulesCount > 0 && (
                        <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded font-semibold">
                          {rulesCount} rule{rulesCount > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Right Side: Interactive Schema Workspace & Rules Editor */}
        <div className="lg:col-span-7 bg-card border border-border rounded-lg p-5 shadow-2xs space-y-5">
          
          {/* Header for selected type */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-primary/10 text-primary border border-primary/20 text-xs px-2 py-0.5 rounded font-mono font-bold">
                  Type {selectedSchemaType}
                </span>
                <h2 className="text-sm font-bold text-foreground font-mono">
                  {currentActiveTypeObj?.name || `TYPE_${selectedSchemaType}`}
                </h2>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {activeSchemaMeta.description}
              </p>
            </div>

            {/* Navigation Tabs using  styling */}
            <div className="flex items-center bg-muted/30 p-1 rounded-md border border-border/60 shrink-0">
              <button
                onClick={() => setActiveSchemaTab("rules")}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold cursor-pointer transition-all ${
                  activeSchemaTab === "rules"
                    ? "bg-background text-foreground shadow-2xs border border-border/50"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Zap className="size-3.5 text-primary" />
                <span>Field Rules</span>
              </button>
              <button
                onClick={() => setActiveSchemaTab("generic")}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold cursor-pointer transition-all ${
                  activeSchemaTab === "generic"
                    ? "bg-background text-foreground shadow-2xs border border-border/50"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Code className="size-3.5" />
                <span>Contract</span>
              </button>
              <button
                onClick={() => setActiveSchemaTab("sample")}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold cursor-pointer transition-all ${
                  activeSchemaTab === "sample"
                    ? "bg-background text-foreground shadow-2xs border border-border/50"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Eye className="size-3.5" />
                <span>Sample</span>
              </button>
            </div>
          </div>

          {/* Template String Editor */}
          <div className="bg-muted/10 border border-border rounded-lg p-4 space-y-2.5">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-foreground flex items-center gap-1.5 font-mono">
                <SlidersHorizontal className="size-3.5 text-primary" />
                Display Column Template (<code className="text-[11px] text-muted-foreground">details_column_template</code>)
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
              <div className="space-y-2">
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
                <p className="text-[11px] text-muted-foreground">
                  Use curly braces to interpolate payload paths, e.g. <code className="text-foreground font-mono font-semibold">&#123;content.title&#125;</code>
                </p>
              </div>
            ) : (
              <div className="font-mono text-xs bg-background border border-border p-2.5 rounded-md text-foreground select-all whitespace-pre-wrap break-all flex items-center justify-between">
                <span>{activeSchemaMeta.template || "-"}</span>
                <span className="text-[10px] text-muted-foreground font-sans">Interpolated format string</span>
              </div>
            )}
          </div>

          {/* TAB 1: Advanced Field-Level Conditional Rules Manager */}
          {activeSchemaTab === "rules" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5 font-mono">
                    <Filter className="size-3.5 text-primary" />
                    Field Conditions & Value Overrides
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Specify item-level mapping rules for event payload parameters.
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
                <form onSubmit={handleAddConditionRule} className="border border-border bg-muted/20 rounded-lg p-4 space-y-3.5 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex justify-between items-center pb-2 border-b border-border">
                    <span className="text-xs font-bold text-foreground font-mono">
                      New Item Condition Rule for Type {selectedSchemaType}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowAddConditionForm(false)}
                      className="text-muted-foreground hover:text-foreground cursor-pointer p-1"
                    >
                      <X className="size-3.5" />
                    </button>
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
                        <SelectTrigger className="w-full h-8 text-xs cursor-pointer bg-background">
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

                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground">Lozenge Badge:</span>
                      <Select
                        value={newRuleBadge}
                        onValueChange={(v) => setNewRuleBadge(v as any)}
                      >
                        <SelectTrigger className="w-28 h-7 text-xs cursor-pointer bg-background">
                          <SelectValue placeholder="Badge Color" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="warning">Yellow</SelectItem>
                          <SelectItem value="info">Blue</SelectItem>
                          <SelectItem value="success">Green</SelectItem>
                          <SelectItem value="destructive">Red</SelectItem>
                          <SelectItem value="default">Gray</SelectItem>
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
              <div className="space-y-2">
                {activeFieldRules.length === 0 ? (
                  <div className="text-center p-8 border border-dashed rounded-md text-muted-foreground text-xs font-mono bg-muted/5">
                    No field condition rules defined for Type {selectedSchemaType}. Click "Add Condition" to create one.
                  </div>
                ) : (
                  activeFieldRules.map((rule) => (
                    <div
                      key={rule.id}
                      className="flex items-center justify-between p-3 border border-border rounded-md bg-card hover:bg-muted/20 transition-colors gap-3 select-none"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono font-semibold text-foreground bg-muted border px-2 py-0.5 rounded">
                            if {rule.field} {rule.operator} "{rule.value}"
                          </span>
                          <ArrowRight className="size-3 text-muted-foreground shrink-0" />
                          <span className="text-xs font-bold text-foreground font-mono">
                            "{rule.display_text}"
                          </span>
                          {rule.badge_color && (
                            <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                              rule.badge_color === "warning" ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30" :
                              rule.badge_color === "info" ? "bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30" :
                              rule.badge_color === "success" ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30" :
                              rule.badge_color === "destructive" ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30" :
                              "bg-muted text-muted-foreground border border-border"
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
                          size="icon-sm"
                          className="h-7 w-7 cursor-pointer"
                          title={rule.enabled ? "Rule is Active" : "Rule is Disabled"}
                        >
                          {rule.enabled ? (
                            <ToggleRight className="size-5 text-primary" />
                          ) : (
                            <ToggleLeft className="size-5 text-muted-foreground/40" />
                          )}
                        </Button>

                        <Button
                          onClick={() => handleDeleteConditionRule(rule.id)}
                          variant="ghost"
                          size="icon-sm"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive cursor-pointer"
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
              <div className="p-3.5 bg-muted/20 border border-border rounded-md space-y-1.5">
                <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between font-mono">
                  <span className="flex items-center gap-1.5">
                    <Activity className="size-3 text-primary" />
                    Evaluated Sample Output Simulation
                  </span>
                  <span className="text-primary font-semibold">Live Preview</span>
                </div>
                <div className="font-mono text-xs text-foreground bg-background p-2.5 rounded-md border border-border font-medium select-all break-all">
                  {evaluatedSampleOutput}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2 & 3: Generic Contract & Sample Inspector */}
          {(activeSchemaTab === "generic" || activeSchemaTab === "sample") && (
            <div className="relative group bg-muted/20 border border-border rounded-lg overflow-hidden flex flex-col min-h-[350px]">
              <div className="flex items-center justify-between px-3.5 py-2 bg-muted/40 border-b border-border text-xs font-mono text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <FileCode className="size-3.5 text-primary" />
                  {activeSchemaTab === "generic" ? "schema_contract.json" : "sample_event_payload.json"}
                </span>
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
                  size="sm"
                  className="h-6 text-[11px] px-2 cursor-pointer gap-1"
                  title="Copy JSON"
                >
                  {copiedText ===
                  JSON.stringify(
                    activeSchemaTab === "generic"
                      ? activeSchemaMeta.generic_structure
                      : activeSchemaMeta.sample_event,
                    null,
                    2
                  ) ? (
                    <>
                      <Check className="size-3 text-primary" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="size-3" />
                      <span>Copy JSON</span>
                    </>
                  )}
                </Button>
              </div>

              <div className="p-4 overflow-auto max-h-[480px] text-left custom-scrollbar bg-background">
                <pre className="text-xs text-foreground font-mono leading-relaxed select-all whitespace-pre-wrap break-all">
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
