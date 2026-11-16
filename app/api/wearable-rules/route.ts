import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"
import { DEFAULT_WEARABLE_EVENT_TYPES, WearableEventTypeMeta } from "@/lib/wearable-event-defaults"

// GET: Fetch wearable event types and all associated field rules from Supabase DB
export async function GET() {
  try {
    const supabase = createAdminClient()

    const [typesRes, rulesRes] = await Promise.all([
      supabase.from("wearable_event_types").select("*").neq("type", 2).order("type", { ascending: true }),
      supabase.from("wearable_field_rules").select("*").order("priority", { ascending: true }),
    ])

    const dbTypes = (typesRes.data || []).filter((d: any) => d.type !== 2)
    const dbRules = rulesRes.data || []

    const rulesByType: Record<number, any[]> = {}

    // 1. Collect rules from wearable_field_rules table if present
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

    // 2. Fallback to JSONB field_rules column on wearable_event_types
    dbTypes.forEach((t: any) => {
      if ((!rulesByType[t.type] || rulesByType[t.type].length === 0) && Array.isArray(t.field_rules) && t.field_rules.length > 0) {
        rulesByType[t.type] = t.field_rules
      }
    })

    const filteredDefaults = DEFAULT_WEARABLE_EVENT_TYPES.filter((d) => d.type !== 2)

    // 3. Merge DB values with defaults
    const eventTypesList: WearableEventTypeMeta[] = filteredDefaults.map((def) => {
      const matched = dbTypes.find((d: any) => d.type === def.type)
      const customRules = rulesByType[def.type]
      const finalRules = customRules && customRules.length > 0 ? customRules : def.field_rules

      return {
        ...def,
        name: matched?.name || def.name,
        description: matched?.description || def.description,
        template: matched?.template || def.template,
        structure: matched?.structure || def.structure,
        sample: matched?.sample || def.sample,
        field_rules: finalRules,
      }
    })

    // 4. Include custom event types stored in DB that are not in hardcoded defaults
    dbTypes
      .filter((d: any) => !filteredDefaults.some((def) => def.type === d.type))
      .forEach((custom: any) => {
        const customRules = rulesByType[custom.type] || custom.field_rules || []
        eventTypesList.push({
          type: custom.type,
          name: custom.name,
          description: custom.description || "",
          template: custom.template || `[${custom.name}] {content}`,
          structure: custom.structure || {},
          sample: custom.sample || {},
          field_rules: customRules,
        })
      })

    return NextResponse.json({
      success: true,
      eventTypes: eventTypesList.sort((a, b) => a.type - b.type),
      rulesByType,
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch wearable rules" },
      { status: 500 }
    )
  }
}

// POST: Save or update template for a wearable event type and its field rules to Supabase DB
export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const body = await request.json()
    const { typeId, template, fieldRules } = body

    if (typeId === undefined) {
      return NextResponse.json({ error: "typeId is required" }, { status: 400 })
    }

    const typeNum = Number(typeId)

    // 1. Update template and JSONB field_rules on wearable_event_types
    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    }
    if (template !== undefined) updatePayload.template = template
    if (fieldRules !== undefined && Array.isArray(fieldRules)) updatePayload.field_rules = fieldRules

    const { error: typeErr } = await supabase
      .from("wearable_event_types")
      .update(updatePayload)
      .eq("type", typeNum)

    if (typeErr) {
      // If table doesn't have field_rules column yet, try updating template only
      if (template !== undefined) {
        await supabase
          .from("wearable_event_types")
          .update({ template, updated_at: new Date().toISOString() })
          .eq("type", typeNum)
      }
      console.warn("Notice updating wearable_event_types columns:", typeErr.message)
    }

    // 2. Sync to wearable_field_rules table if table exists
    if (fieldRules && Array.isArray(fieldRules)) {
      try {
        await supabase.from("wearable_field_rules").delete().eq("type_id", typeNum)
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
          const { error: insertErr } = await supabase.from("wearable_field_rules").insert(rowsToInsert)
          if (insertErr) {
            console.warn("Notice inserting into wearable_field_rules table:", insertErr.message)
          }
        }
      } catch (tableErr: any) {
        console.warn("Could not sync wearable_field_rules table:", tableErr.message)
      }
    }

    return NextResponse.json({ success: true, typeId: typeNum })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to save wearable rules" },
      { status: 500 }
    )
  }
}
