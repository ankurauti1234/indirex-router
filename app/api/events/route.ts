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

    const rulesByType: Record<number, any> = {}
    ;(rulesRes.data || []).forEach((r: any) => {
      const typeId = r.type_id ?? r.type
      const extractedRules = r.field_rules || r.structure?._field_rules || []
      rulesByType[typeId] = {
        template: r.template,
        field_rules: Array.isArray(extractedRules) ? extractedRules : [],
      }
    })

    const enrichedEventTypes = (typesRes.data || []).map((t: any) => {
      const dbRule = rulesByType[t.type]
      let fieldRules = dbRule?.field_rules || []

      // Built-in intelligent playback rules if DB table is unconfigured
      if (fieldRules.length === 0) {
        if (t.type === 1 || t.type === 2) {
          fieldRules = [
            { id: "sdk-4k", field: "playback.bitrate", operator: "contains", value: "4K", display_text: "4K UHD", badge_color: "success", enabled: true },
            { id: "sdk-hd", field: "playback.bitrate", operator: "contains", value: "1080", display_text: "Full HD", badge_color: "info", enabled: true },
            { id: "sdk-720p", field: "playback.bitrate", operator: "contains", value: "720", display_text: "HD 720p", badge_color: "default", enabled: true },
            { id: "sdk-movie", field: "content.content_type", operator: "equals", value: "Movie", display_text: "Feature Film", badge_color: "info", enabled: true },
          ]
        } else if (t.type === 3) {
          fieldRules = [
            { id: "sdk-buffering", field: "reason", operator: "equals", value: "buffering", display_text: "Buffering Alert", badge_color: "warning", enabled: true },
            { id: "sdk-user-pause", field: "reason", operator: "equals", value: "user_pause", display_text: "User Paused", badge_color: "default", enabled: true },
          ]
        } else if (t.type === 5) {
          fieldRules = [
            { id: "sdk-completed", field: "reason", operator: "equals", value: "completed", display_text: "Finished", badge_color: "success", enabled: true },
          ]
        }
      }

      return {
        ...t,
        template: dbRule?.template || t.template || "[{content.platform}] {content.title} • {device_context.device_type} ({playback.bitrate})",
        field_rules: fieldRules,
      }
    })

    return NextResponse.json({
      events: eventsRes.data || [],
      eventTypes: enrichedEventTypes,
      rules: rulesRes.data || [],
      totalFetched: eventsRes.data?.length || 0,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to fetch events" }, { status: 500 })
  }
}
