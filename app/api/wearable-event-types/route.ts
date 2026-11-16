import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"
import { DEFAULT_WEARABLE_EVENT_TYPES } from "@/lib/wearable-event-defaults"

export async function GET() {
  try {
    const supabase = createAdminClient()
    const [typesRes, rulesRes] = await Promise.all([
      supabase.from("wearable_event_types").select("*").neq("type", 2).order("type", { ascending: true }),
      supabase.from("wearable_field_rules").select("*").order("priority", { ascending: true }),
    ])

    const dbList = (typesRes.data || []).filter((d: any) => d.type !== 2)
    const dbRules = rulesRes.data || []

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

    dbList.forEach((t: any) => {
      if ((!rulesByType[t.type] || rulesByType[t.type].length === 0) && Array.isArray(t.field_rules) && t.field_rules.length > 0) {
        rulesByType[t.type] = t.field_rules
      }
    })

    // 1. Enrich default types with DB names, descriptions, templates, and field rules
    const enriched = DEFAULT_WEARABLE_EVENT_TYPES
      .filter((defType) => defType.type !== 2)
      .map((defType) => {
        const matched = dbList.find((d: any) => d.type === defType.type)
        const customRules = rulesByType[defType.type]
        const finalRules = customRules && customRules.length > 0 ? customRules : defType.field_rules

        return {
          ...defType,
          name: matched?.name || defType.name,
          description: matched?.description || defType.description,
          template: matched?.template || defType.template,
          structure: matched?.structure || defType.structure,
          sample: matched?.sample || defType.sample,
          field_rules: finalRules,
        }
      })

    // 2. Include any custom event types stored in DB that are not in hardcoded defaults
    const customTypes = dbList
      .filter((d: any) => d.type !== 2 && !DEFAULT_WEARABLE_EVENT_TYPES.some((def) => def.type === d.type))
      .map((d: any) => ({
        type: d.type,
        name: d.name,
        description: d.description || "",
        template: d.template || `[${d.name}] {content}`,
        structure: d.structure || {},
        sample: d.sample || {},
        field_rules: rulesByType[d.type] || d.field_rules || [],
      }))

    return NextResponse.json({
      success: true,
      eventTypes: [...enriched, ...customTypes].sort((a, b) => a.type - b.type),
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch wearable event types" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, name, description, template, structure, sample, field_rules } = body

    if (type === undefined || !name) {
      return NextResponse.json({ error: "Type ID and Name are required" }, { status: 400 })
    }

    const typeNum = Number(type)
    if (isNaN(typeNum)) {
      return NextResponse.json({ error: "Type ID must be a number" }, { status: 400 })
    }

    const supabase = createAdminClient()

    const payload: Record<string, any> = {
      type: typeNum,
      name: String(name).trim().toUpperCase(),
      description: description ? String(description).trim() : "",
      updated_at: new Date().toISOString(),
    }
    if (template !== undefined) payload.template = template
    if (structure !== undefined) payload.structure = structure
    if (sample !== undefined) payload.sample = sample
    if (field_rules !== undefined) payload.field_rules = field_rules

    const { data, error } = await supabase
      .from("wearable_event_types")
      .upsert(payload, { onConflict: "type" })
      .select()

    if (error) {
      // If table doesn't have extended columns yet, fallback to core columns
      const corePayload = {
        type: typeNum,
        name: payload.name,
        description: payload.description,
      }
      const { error: coreErr } = await supabase
        .from("wearable_event_types")
        .upsert(corePayload, { onConflict: "type" })

      if (coreErr) {
        return NextResponse.json({ error: coreErr.message }, { status: 500 })
      }
    }

    return NextResponse.json({
      success: true,
      eventType: {
        type: typeNum,
        name: payload.name,
        description: payload.description,
        template: template || undefined,
        structure: structure || undefined,
        sample: sample || undefined,
        field_rules: field_rules || [],
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to save wearable event type" }, { status: 500 })
  }
}
