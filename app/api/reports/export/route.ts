import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"
import {
  ROUTER_EVENT_COLUMNS,
  PLAYBACK_EVENT_COLUMNS,
  flattenRouterEvent,
  flattenPlaybackEvent,
  generateCsvString,
  generateXlsxBuffer,
  ReportSource,
  ExportFormat,
} from "@/lib/reports-export-helper"
import { DEFAULT_ROUTER_EVENT_TYPES } from "@/lib/router-event-defaults"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const source = (searchParams.get("source") || "router_events") as ReportSource
    const format = (searchParams.get("format") || "preview") as ExportFormat | "preview"
    const typesParam = searchParams.get("types")
    const deviceId = searchParams.get("device_id")
    const subDeviceId = searchParams.get("sub_device_id")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const search = searchParams.get("search") || ""
    const limitParam = searchParams.get("limit")
    const timezone = searchParams.get("timezone") || "UTC"
    const formatTimestamps = searchParams.get("formatTimestamps") !== "false"
    const columnsParam = searchParams.get("columns")

    const types = typesParam
      ? typesParam.split(",").map((t) => parseInt(t.trim(), 10)).filter((n) => !isNaN(n))
      : []
    const limit = limitParam ? parseInt(limitParam, 10) : 0
    const selectedColumns = columnsParam ? columnsParam.split(",").map((c) => c.trim()) : undefined

    return await handleExportRequest({
      source,
      format,
      types,
      deviceId: deviceId || undefined,
      subDeviceId: subDeviceId || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      search,
      limit,
      timezone,
      formatTimestamps,
      selectedColumns,
    })
  } catch (err: any) {
    console.error("Export API error:", err)
    return NextResponse.json({ error: err.message || "Failed to process export" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const source = (body.source || "router_events") as ReportSource
    const format = (body.format || "preview") as ExportFormat | "preview"
    const types = Array.isArray(body.types)
      ? body.types.map((t: any) => Number(t)).filter((n: number) => !isNaN(n))
      : []
    const deviceId = body.deviceId || body.device_id
    const subDeviceId = body.subDeviceId || body.sub_device_id
    const startDate = body.startDate
    const endDate = body.endDate
    const search = body.search || ""
    const limit = typeof body.limit === "number" ? body.limit : 0
    const timezone = body.timezone || "UTC"
    const formatTimestamps = body.formatTimestamps !== false
    const selectedColumns = Array.isArray(body.selectedColumns) ? body.selectedColumns : undefined

    return await handleExportRequest({
      source,
      format,
      types,
      deviceId,
      subDeviceId,
      startDate,
      endDate,
      search,
      limit,
      timezone,
      formatTimestamps,
      selectedColumns,
    })
  } catch (err: any) {
    console.error("Export API error:", err)
    return NextResponse.json({ error: err.message || "Failed to process export" }, { status: 500 })
  }
}

interface ExportParams {
  source: ReportSource
  format: ExportFormat | "preview"
  types: number[]
  deviceId?: string
  subDeviceId?: string
  startDate?: string
  endDate?: string
  search?: string
  limit: number
  timezone: string
  formatTimestamps: boolean
  selectedColumns?: string[]
}

async function handleExportRequest(params: ExportParams) {
  const {
    source,
    format,
    types,
    deviceId,
    subDeviceId,
    startDate,
    endDate,
    search,
    limit,
    timezone,
    formatTimestamps,
    selectedColumns,
  } = params

  const supabase = createAdminClient()
  const tableName = source === "router_events" ? "router_events" : "playback_events"
  const typesTableName = source === "router_events" ? "router_event_types" : "event_types"
  const columnDefs = source === "router_events" ? ROUTER_EVENT_COLUMNS : PLAYBACK_EVENT_COLUMNS

  // 1. Fetch metadata: event types
  let eventTypesList: any[] = []
  const { data: dbTypes } = await supabase.from(typesTableName).select("*").order("type", { ascending: true })
  if (dbTypes && dbTypes.length > 0) {
    eventTypesList = dbTypes
  } else if (source === "router_events") {
    eventTypesList = DEFAULT_ROUTER_EVENT_TYPES
  }

  const typeNamesMap = new Map<number, string>(
    eventTypesList.map((t: any) => [t.type, t.name || `TYPE_${t.type}`])
  )

  // 2. Base query builder
  const buildFilteredQuery = (fields = "*") => {
    let q = supabase.from(tableName).select(fields)

    if (types && types.length > 0) {
      q = q.in("type", types)
    }
    if (deviceId && deviceId !== "ALL") {
      q = q.eq("device_id", deviceId)
    }
    if (source === "router_events") {
      if (subDeviceId === "NULL") {
        q = q.is("sub_device_id", null)
      } else if (subDeviceId && subDeviceId !== "ALL") {
        q = q.eq("sub_device_id", subDeviceId)
      }
    }
    if (startDate) {
      q = q.gte("timestamp", startDate)
    }
    if (endDate) {
      q = q.lte("timestamp", endDate)
    }

    return q
  }

  // Handle "preview" format
  if (format === "preview") {
    // Exact count
    let countQuery = supabase.from(tableName).select("*", { count: "exact", head: true })
    if (types && types.length > 0) countQuery = countQuery.in("type", types)
    if (deviceId && deviceId !== "ALL") countQuery = countQuery.eq("device_id", deviceId)
    if (source === "router_events") {
      if (subDeviceId === "NULL") countQuery = countQuery.is("sub_device_id", null)
      else if (subDeviceId && subDeviceId !== "ALL") countQuery = countQuery.eq("sub_device_id", subDeviceId)
    }
    if (startDate) countQuery = countQuery.gte("timestamp", startDate)
    if (endDate) countQuery = countQuery.lte("timestamp", endDate)

    const { count, error: countErr } = await countQuery
    if (countErr) {
      console.warn("Count error in preview:", countErr)
    }

    // Sample 10 rows
    const { data: sampleRows, error: sampleErr } = await buildFilteredQuery()
      .order("timestamp", { ascending: false })
      .limit(10)

    if (sampleErr) {
      return NextResponse.json({ error: sampleErr.message }, { status: 500 })
    }

    // Distinct devices for filtering dropdown
    const { data: devData } = await supabase.from(tableName).select("device_id")
    const distinctDevices = Array.from(
      new Set(devData?.map((d: any) => d.device_id).filter(Boolean) || [])
    ).sort()

    // Flatten sample rows
    const flattenedSample = (sampleRows || []).map((row: any) =>
      source === "router_events"
        ? flattenRouterEvent(row, { timezone, formatTimestamps, typeNamesMap })
        : flattenPlaybackEvent(row, { timezone, formatTimestamps, typeNamesMap })
    )

    return NextResponse.json({
      totalCount: count ?? sampleRows?.length ?? 0,
      sampleRows: flattenedSample,
      distinctDevices,
      eventTypes: eventTypesList,
      availableColumns: columnDefs,
    })
  }

  // For CSV / XLSX / JSON export: fetch all matching rows (in 1000-row chunks)
  const maxRowsToFetch = limit > 0 ? limit : 50000
  const pageSize = 1000
  let fetchedRows: any[] = []
  let pageIndex = 0
  let hasMore = true

  while (hasMore && fetchedRows.length < maxRowsToFetch) {
    const rangeStart = pageIndex * pageSize
    const remaining = maxRowsToFetch - fetchedRows.length
    const fetchSize = Math.min(pageSize, remaining)
    const rangeEnd = rangeStart + fetchSize - 1

    const { data, error } = await buildFilteredQuery()
      .order("timestamp", { ascending: false })
      .range(rangeStart, rangeEnd)

    if (error) {
      console.error("Error fetching export chunk:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (data && data.length > 0) {
      fetchedRows.push(...data)
      if (data.length < fetchSize) {
        hasMore = false
      } else {
        pageIndex++
      }
    } else {
      hasMore = false
    }
  }

  // If keyword search provided, filter in-memory across fields
  if (search && search.trim()) {
    const s = search.toLowerCase().trim()
    fetchedRows = fetchedRows.filter((r) => {
      const dev = String(r.device_id || "").toLowerCase()
      const sub = String(r.sub_device_id || "").toLowerCase()
      const detailsStr = typeof r.details === "object" ? JSON.stringify(r.details).toLowerCase() : String(r.details || "").toLowerCase()
      return dev.includes(s) || sub.includes(s) || detailsStr.includes(s)
    })
  }

  // Flatten rows
  const flattenedRows = fetchedRows.map((row) =>
    source === "router_events"
      ? flattenRouterEvent(row, { timezone, formatTimestamps, typeNamesMap })
      : flattenPlaybackEvent(row, { timezone, formatTimestamps, typeNamesMap })
  )

  const timestampIso = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)
  const baseFilename = `${source}_report_${timestampIso}`

  if (format === "json") {
    return NextResponse.json({
      source,
      totalRecords: flattenedRows.length,
      exportedAt: new Date().toISOString(),
      rows: flattenedRows,
    })
  }

  if (format === "xlsx") {
    const sheetTitle = source === "router_events" ? "Router Events" : "Playback Events"
    const buffer = generateXlsxBuffer(flattenedRows, columnDefs, sheetTitle, selectedColumns)

    return new Response(buffer as any, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${baseFilename}.xlsx"`,
      },
    })
  }

  // Default: CSV format
  const csvContent = generateCsvString(flattenedRows, columnDefs, selectedColumns)
  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${baseFilename}.csv"`,
    },
  })
}
