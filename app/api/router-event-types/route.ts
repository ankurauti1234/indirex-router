import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("router_event_types")
      .select("*")
      .order("type", { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to fetch router event types" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, name, description, template, structure, sample, category, is_active } = body

    if (type === undefined || !name) {
      return NextResponse.json({ error: "Type and Name are required" }, { status: 400 })
    }

    const supabase = createAdminClient()

    const payload: any = {
      type: Number(type),
      name: String(name).trim().toUpperCase(),
      description: description ? String(description).trim() : "",
      updated_at: new Date().toISOString(),
    }

    if (template !== undefined) payload.template = template
    if (structure !== undefined) payload.structure = structure
    if (sample !== undefined) payload.sample = sample
    if (category !== undefined) payload.category = category
    if (is_active !== undefined) payload.is_active = is_active

    const { data, error } = await supabase
      .from("router_event_types")
      .upsert(payload, { onConflict: "type" })
      .select()

    if (error) {
      // If newer columns don't exist yet in DB, fallback to core columns
      const fallbackPayload = {
        type: Number(type),
        name: String(name).trim().toUpperCase(),
        description: description ? String(description).trim() : "",
      }
      const { data: fallbackData, error: fallbackError } = await supabase
        .from("router_event_types")
        .upsert(fallbackPayload, { onConflict: "type" })
        .select()

      if (fallbackError) {
        return NextResponse.json({ error: fallbackError.message }, { status: 500 })
      }
      return NextResponse.json(fallbackData?.[0] || null)
    }

    return NextResponse.json(data?.[0] || null)
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to save router event type" }, { status: 500 })
  }
}
