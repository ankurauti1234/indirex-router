import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"
import { DEFAULT_WEARABLE_EVENT_TYPES } from "@/lib/wearable-event-defaults"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")
    const deviceId = searchParams.get("device_id")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const page = parseInt(searchParams.get("page") || "1", 10)
    const pageSize = Math.min(Math.max(parseInt(searchParams.get("pageSize") || "50", 10), 10), 500)
    const offset = (page - 1) * pageSize

    const supabase = createAdminClient()

    // 1. Fetch wearable event types and devices in parallel
    const [typesRes, devTableRes] = await Promise.all([
      supabase.from("wearable_event_types").select("*").order("type", { ascending: true }),
      supabase.from("wearable_devices").select("device_id").limit(200),
    ])

    // 2. Resolve distinct wearable devices
    let distinctDevices: string[] = []
    if (devTableRes.data && devTableRes.data.length > 0) {
      distinctDevices = Array.from(new Set(devTableRes.data.map((d: any) => d.device_id).filter(Boolean))).sort()
    } else {
      const recentRes = await supabase
        .from("wearable_events")
        .select("device_id")
        .order("timestamp", { ascending: false })
        .limit(200)
      distinctDevices = Array.from(new Set(recentRes.data?.map((d: any) => d.device_id).filter(Boolean) || [])).sort()
    }

    // 3. Build filtered query for wearable events
    let query = supabase.from("wearable_events").select("*", { count: "exact" })

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

    const { data: eventsData, error: eventsError, count: totalCount } = await query
      .order("timestamp", { ascending: false })
      .range(offset, offset + pageSize - 1)

    if (eventsError) {
      return NextResponse.json({ error: eventsError.message }, { status: 500 })
    }

    // Enrich wearable event types with templates and field rules
    const dbTypes = typesRes.data || []
    const enrichedEventTypes = DEFAULT_WEARABLE_EVENT_TYPES.map((defType) => {
      const matchedDb = dbTypes.find((d: any) => d.type === defType.type)
      return {
        ...defType,
        name: matchedDb?.name || defType.name,
        description: matchedDb?.description || defType.description,
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
    return NextResponse.json({ error: e.message || "Failed to fetch wearable telemetry events" }, { status: 500 })
  }
}

