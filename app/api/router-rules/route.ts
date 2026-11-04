import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"
import { DEFAULT_ROUTER_EVENT_TYPES } from "@/lib/router-event-defaults"

// GET: Fetch event types and all associated field rules from Supabase DB
export async function GET() {
  try {
    const supabase = createAdminClient()

    const [typesRes, rulesRes] = await Promise.all([
      supabase.from("router_event_types").select("*").order("type", { ascending: true }),
      supabase.from("router_field_rules").select("*").order("priority", { ascending: true }),
    ])

    const dbTypes = typesRes.data || []
    const dbRules = rulesRes.data || []

    // If router_field_rules table does not exist or is empty, provide fallback from defaults
    const rulesByType: Record<number, any[]> = {}
    dbRules.forEach((rule: any) => {
      if (!rulesByType[rule.type_id]) rulesByType[rule.type_id] = []
      rulesByType[rule.type_id].push({
        id: String(rule.id),
        field: rule.field,
        operator: rule.operator,
        value: rule.value,
        display_text: rule.display_text,
        badge_color: rule.badge_color || "default",
        enabled: rule.enabled ?? true,
      })
    })

    // Query DB as primary source of truth
    const eventTypesList = dbTypes.length > 0
      ? dbTypes.map((t: any) => ({
          type: t.type,
          name: t.name || `TYPE_${t.type}`,
          description: t.description || "",
          template: t.template !== undefined && t.template !== null ? t.template : "[{details}]",
          structure: t.structure || {},
          sample: t.sample || {},
          field_rules: rulesByType[t.type] || [],
          category: t.category || "NETWORK",
          is_active: t.is_active ?? true,
        }))
      : DEFAULT_ROUTER_EVENT_TYPES.map(def => ({
          ...def,
          field_rules: rulesByType[def.type] && rulesByType[def.type].length > 0 ? rulesByType[def.type] : def.field_rules,
        }))

    return NextResponse.json({
      success: true,
      eventTypes: eventTypesList.sort((a, b) => a.type - b.type),
      rulesByType,
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch router rules" },
      { status: 500 }
    )
  }
}

// POST: Save or update template for an event type and its field rules
export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const body = await request.json()
    const { typeId, template, fieldRules } = body

    if (typeId === undefined) {
      return NextResponse.json({ error: "typeId is required" }, { status: 400 })
    }

    const typeNum = Number(typeId)

    // 1. Update template on router_event_types if provided
    if (template !== undefined) {
      const { error: typeErr } = await supabase
        .from("router_event_types")
        .update({ template, updated_at: new Date().toISOString() })
        .eq("type", typeNum)

      if (typeErr) {
        console.warn("Could not update template column on router_event_types:", typeErr.message)
      }
    }

    // 2. Sync field rules if provided
    if (fieldRules && Array.isArray(fieldRules)) {
      // Delete existing rules for this type
      await supabase.from("router_field_rules").delete().eq("type_id", typeNum)

      // Re-insert updated rules
      if (fieldRules.length > 0) {
        const rowsToInsert = fieldRules.map((r: any, idx: number) => ({
          type_id: typeNum,
          field: r.field,
          operator: r.operator || "equals",
          value: String(r.value || ""),
          display_text: r.display_text || "",
          badge_color: r.badge_color || "default",
          priority: idx,
          enabled: r.enabled ?? true,
          updated_at: new Date().toISOString(),
        }))

        const { error: rulesErr } = await supabase.from("router_field_rules").insert(rowsToInsert)
        if (rulesErr) {
          console.warn("Could not insert rows into router_field_rules table:", rulesErr.message)
        }
      }
    }

    return NextResponse.json({ success: true, typeId: typeNum })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to save router rules" },
      { status: 500 }
    )
  }
}

