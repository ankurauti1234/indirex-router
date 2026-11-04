import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"
import { DEFAULT_WEARABLE_EVENT_TYPES } from "@/lib/wearable-event-defaults"

export async function GET() {
  try {
    const supabase = createAdminClient()
    const { data: dbTypes } = await supabase
      .from("wearable_event_types")
      .select("*")
      .order("type", { ascending: true })

    const enriched = DEFAULT_WEARABLE_EVENT_TYPES.map((defType) => {
      const matched = (dbTypes || []).find((d: any) => d.type === defType.type)
      return {
        ...defType,
        name: matched?.name || defType.name,
        description: matched?.description || defType.description,
      }
    })

    return NextResponse.json({
      success: true,
      eventTypes: enriched,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch wearable event types" }, { status: 500 })
  }
}

