import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")
    const deviceId = searchParams.get("device_id")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const limitParam = searchParams.get("limit")
    const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10), 50), 20000) : 2000

    const supabase = createAdminClient()

    // Build playback_events query
    let query = supabase.from("playback_events").select("*")

    if (type && type !== "ALL") {
      query = query.eq("type", parseInt(type, 10))
    }
    if (deviceId && deviceId !== "ALL") {
      query = query.eq("device_id", deviceId)
    }
    if (startDate) {
      query = query.gte("timestamp", startDate)
    }
    if (endDate) {
      query = query.lte("timestamp", endDate)
    }

    // Parallel fetch: types, rules, and events
    const [typesRes, rulesRes, eventsRes] = await Promise.all([
      supabase.from("event_types").select("*").order("type", { ascending: true }),
      supabase.from("event_details_rules").select("*"),
      query.order("timestamp", { ascending: false }).limit(limit),
    ])

    if (eventsRes.error) {
      return NextResponse.json({ error: eventsRes.error.message }, { status: 500 })
    }

    return NextResponse.json({
      events: eventsRes.data || [],
      eventTypes: typesRes.data || [],
      rules: rulesRes.data || [],
      totalFetched: eventsRes.data?.length || 0,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to fetch events" }, { status: 500 })
  }
}
