import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"
import { DEFAULT_WEARABLE_EVENT_TYPES } from "@/lib/wearable-event-defaults"

export async function GET() {
  try {
    const supabase = createAdminClient()
    const { data: dbTypes } = await supabase
      .from("wearable_event_types")
      .select("*")
      .order("type", { ascending: true })

    const dbList = dbTypes || []

    // 1. Enrich default types with DB names and descriptions
    const enriched = DEFAULT_WEARABLE_EVENT_TYPES.map((defType) => {
      const matched = dbList.find((d: any) => d.type === defType.type)
      return {
        ...defType,
        name: matched?.name || defType.name,
        description: matched?.description || defType.description,
      }
    })

    // 2. Include any custom event types stored in DB that are not in hardcoded defaults
    const customTypes = dbList
      .filter((d: any) => !DEFAULT_WEARABLE_EVENT_TYPES.some((def) => def.type === d.type))
      .map((d: any) => ({
        type: d.type,
        name: d.name,
        description: d.description || "",
        template: `[${d.name}] {content}`,
        structure: {},
        sample: {},
        field_rules: [],
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
    const { type, name, description, template, structure, sample } = body

    if (type === undefined || !name) {
      return NextResponse.json({ error: "Type ID and Name are required" }, { status: 400 })
    }

    const typeNum = Number(type)
    if (isNaN(typeNum)) {
      return NextResponse.json({ error: "Type ID must be a number" }, { status: 400 })
    }

    const supabase = createAdminClient()

    const payload = {
      type: typeNum,
      name: String(name).trim().toUpperCase(),
      description: description ? String(description).trim() : "",
    }

    const { data, error } = await supabase
      .from("wearable_event_types")
      .upsert(payload, { onConflict: "type" })
      .select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
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
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to save wearable event type" }, { status: 500 })
  }
}
