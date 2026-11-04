import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"
import { DEFAULT_ROUTER_EVENT_TYPES } from "@/lib/router-event-defaults"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")
    const deviceId = searchParams.get("device_id")
    const subDeviceId = searchParams.get("sub_device_id")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const page = parseInt(searchParams.get("page") || "1", 10)
    const pageSize = Math.min(Math.max(parseInt(searchParams.get("pageSize") || "50", 10), 10), 500)
    const offset = (page - 1) * pageSize

    const supabase = createAdminClient()

    // 1. Fetch event types & field rules in parallel
    const [typesRes, rulesRes, devTableRes] = await Promise.all([
      supabase.from("router_event_types").select("*").order("type", { ascending: true }),
      supabase.from("router_field_rules").select("*").eq("enabled", true).order("priority", { ascending: true }),
      supabase.from("devices").select("device_id").limit(200),
    ])

    // 2. Resolve distinct devices without full table scan
    let distinctDevices: string[] = []
    if (devTableRes.data && devTableRes.data.length > 0) {
      distinctDevices = Array.from(new Set(devTableRes.data.map((d: any) => d.device_id).filter(Boolean))).sort()
    } else {
      // Fallback to distinct view or limited query
      const viewRes = await supabase.from("v_distinct_router_devices").select("device_id").limit(200)
      if (viewRes.data && viewRes.data.length > 0) {
        distinctDevices = viewRes.data.map((d: any) => d.device_id).filter(Boolean).sort()
      } else {
        const recentRes = await supabase.from("router_events").select("device_id").order("timestamp", { ascending: false }).limit(200)
        distinctDevices = Array.from(new Set(recentRes.data?.map((d: any) => d.device_id).filter(Boolean) || [])).sort()
      }
    }

    // 3. Build filtered query for router events
    let query = supabase.from("router_events").select("*", { count: "exact" })

    if (type && type !== "ALL") {
      query = query.eq("type", parseInt(type, 10))
    }
    if (deviceId && deviceId !== "ALL") {
      query = query.eq("device_id", deviceId)
    }
    if (subDeviceId === "NULL") {
      query = query.is("sub_device_id", null)
    } else if (subDeviceId && subDeviceId !== "ALL") {
      query = query.eq("sub_device_id", subDeviceId)
    }
    if (startDate) {
      query = query.gte("timestamp", startDate)
    }
    if (endDate) {
      query = query.lte("timestamp", endDate)
    }

    const { data: eventsData, error: eventsError, count: totalCount } = await query
      .order("timestamp", { ascending: false })
      .range(offset, offset + pageSize - 1)

    if (eventsError) {
      return NextResponse.json({ error: eventsError.message }, { status: 500 })
    }

    // Attach rules to event types
    const rulesByType: Record<number, any[]> = {}
    ;(rulesRes.data || []).forEach((r: any) => {
      if (!rulesByType[r.type_id]) rulesByType[r.type_id] = []
      rulesByType[r.type_id].push({
        id: String(r.id),
        field: r.field,
        operator: r.operator,
        value: r.value,
        display_text: r.display_text,
        badge_color: r.badge_color || "default",
        enabled: r.enabled ?? true,
      })
    })

    const baseTypes = (typesRes.data && typesRes.data.length > 0) ? typesRes.data : DEFAULT_ROUTER_EVENT_TYPES

    const enrichedEventTypes = baseTypes.map((t: any) => {
      const dbRules = rulesByType[t.type]
      return {
        ...t,
        template: t.template || "[{details}]",
        field_rules: (dbRules && dbRules.length > 0) ? dbRules : (DEFAULT_ROUTER_EVENT_TYPES.find((d) => d.type === t.type)?.field_rules || []),
      }
    })

    return NextResponse.json({
      success: true,
      events: eventsData || [],
      distinctDevices,
      eventTypes: enrichedEventTypes,
      pagination: {
        page,
        pageSize,
        totalCount: totalCount ?? eventsData?.length ?? 0,
        hasMore: totalCount ? offset + pageSize < totalCount : (eventsData?.length === pageSize),
      },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to fetch router events" }, { status: 500 })
  }
}
