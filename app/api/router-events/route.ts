import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")
    const deviceId = searchParams.get("device_id")
    const subDeviceId = searchParams.get("sub_device_id")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    const supabase = createAdminClient()

    // 1. Fetch event types
    const typesRes = await supabase.from("router_event_types").select("*").order("type", { ascending: true })

    // 2. Fetch distinct device IDs
    const devicesRes = await supabase.from("router_events").select("device_id")
    const distinctDevices = Array.from(
      new Set(devicesRes.data?.map((d: any) => d.device_id).filter(Boolean) || [])
    ).sort()

    // 3. Query router events with filters
    let query = supabase.from("router_events").select("*")

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

    const { data: eventsData, error: eventsError } = await query
      .order("timestamp", { ascending: false })
      .limit(2000)

    if (eventsError) {
      return NextResponse.json({ error: eventsError.message }, { status: 500 })
    }

    return NextResponse.json({
      events: eventsData || [],
      distinctDevices,
      eventTypes: typesRes.data || [],
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to fetch router events" }, { status: 500 })
  }
}
