import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

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
    const { type, name, description } = body

    if (type === undefined || !name) {
      return NextResponse.json({ error: "Type and Name are required" }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("router_event_types")
      .upsert({ type: Number(type), name, description }, { onConflict: "type" })
      .select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data?.[0] || null)
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to save router event type" }, { status: 500 })
  }
}
