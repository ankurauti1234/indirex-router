import * as XLSX from "xlsx"
import { formatTimestamp } from "@/lib/timezones"
import { formatRouterDetails, DEFAULT_ROUTER_EVENT_TYPES, RouterEventTypeMeta } from "@/lib/router-event-defaults"

export type ReportSource = "router_events" | "playback_events"
export type ExportFormat = "xlsx" | "csv" | "json"
export type ColumnPreset = "flattened" | "extended" | "raw" | "custom"

export interface ExportColumnDef {
  key: string
  label: string
  category: "core" | "network" | "content" | "device" | "advanced"
  defaultSelected: boolean
}

export const ROUTER_EVENT_COLUMNS: ExportColumnDef[] = [
  { key: "id", label: "Event ID", category: "core", defaultSelected: true },
  { key: "timestamp", label: "Timestamp", category: "core", defaultSelected: true },
  { key: "device_id", label: "Router Device ID", category: "core", defaultSelected: true },
  { key: "sub_device_id", label: "Sub Device ID", category: "core", defaultSelected: true },
  { key: "type", label: "Type Code", category: "core", defaultSelected: true },
  { key: "type_name", label: "Event Type Name", category: "core", defaultSelected: true },
  { key: "summary", label: "Event Summary", category: "core", defaultSelected: true },
  { key: "ip", label: "Client IP", category: "network", defaultSelected: true },
  { key: "mac", label: "Client MAC", category: "network", defaultSelected: true },
  { key: "hostname", label: "Hostname", category: "network", defaultSelected: true },
  { key: "iface", label: "Network Interface", category: "network", defaultSelected: true },
  { key: "domain", label: "Domain / Host", category: "network", defaultSelected: true },
  { key: "domain_category", label: "Domain Category", category: "network", defaultSelected: false },
  { key: "traffic_bytes", label: "Traffic Bytes", category: "network", defaultSelected: false },
  { key: "duration_sec", label: "Duration (sec)", category: "network", defaultSelected: false },
  { key: "youtube_title", label: "YouTube Title / ID", category: "content", defaultSelected: false },
  { key: "created_at", label: "Created At (Server)", category: "core", defaultSelected: false },
  { key: "dedupe_key", label: "Dedupe Key", category: "advanced", defaultSelected: false },
  { key: "raw_details", label: "Raw Details (JSON)", category: "advanced", defaultSelected: false },
]

export const PLAYBACK_EVENT_COLUMNS: ExportColumnDef[] = [
  { key: "id", label: "Event ID", category: "core", defaultSelected: true },
  { key: "timestamp", label: "Timestamp", category: "core", defaultSelected: true },
  { key: "device_id", label: "Router Device ID", category: "core", defaultSelected: true },
  { key: "type", label: "Type Code", category: "core", defaultSelected: true },
  { key: "type_name", label: "Event Type Name", category: "core", defaultSelected: true },
  { key: "summary", label: "Event Summary", category: "core", defaultSelected: true },
  { key: "platform", label: "Platform", category: "content", defaultSelected: true },
  { key: "title", label: "Content Title", category: "content", defaultSelected: true },
  { key: "genre", label: "Genre", category: "content", defaultSelected: true },
  { key: "audio_language", label: "Audio Language", category: "content", defaultSelected: true },
  { key: "content_type", label: "Content Type", category: "content", defaultSelected: false },
  { key: "content_domain", label: "Content Domain", category: "content", defaultSelected: false },
  { key: "playhead_position", label: "Playhead Position (s)", category: "content", defaultSelected: true },
  { key: "bitrate", label: "Bitrate", category: "content", defaultSelected: false },
  { key: "volume_level", label: "Volume (%)", category: "content", defaultSelected: false },
  { key: "target_hostname", label: "Target Hostname", category: "device", defaultSelected: true },
  { key: "target_device_type", label: "Target Device Type", category: "device", defaultSelected: true },
  { key: "target_os", label: "Target OS", category: "device", defaultSelected: false },
  { key: "target_ip", label: "Target IP Address", category: "device", defaultSelected: false },
  { key: "hhid", label: "Household ID (HHID)", category: "device", defaultSelected: true },
  { key: "member_id", label: "Household Member ID", category: "device", defaultSelected: false },
  { key: "reason", label: "Reason / Trigger", category: "advanced", defaultSelected: false },
  { key: "created_at", label: "Created At (Server)", category: "core", defaultSelected: false },
  { key: "raw_details", label: "Raw Details (JSON)", category: "advanced", defaultSelected: false },
]

export const PLAYBACK_EVENT_TYPE_NAMES: Record<number, string> = {
  1: "PLAY_START",
  2: "PLAY_HEARTBEAT",
  3: "PLAY_PAUSE",
  4: "PLAY_RESUME",
  5: "PLAY_END",
  6: "CONTENT_CHANGE",
}

/**
 * Format fallback summary for playback events
 */
export function getPlaybackSummary(details: any, typeId: number): string {
  if (!details || typeof details !== "object") return "-"
  switch (typeId) {
    case 1:
      return `[${details.content?.platform || ""}] ${details.content?.title || ""}`
    case 2:
      return `playhead: ${details.playback?.playhead_position ?? 0}s • bitrate: ${details.playback?.bitrate || "-"} • downloaded: ${details.playback?.bytes_downloaded || 0} bytes`
    case 3:
      return `playhead: ${details.playhead_position ?? details.playback?.playhead_position ?? 0}s • reason: ${details.reason || ""} • volume: ${details.volume_level ?? details.playback?.volume_level ?? 0}%`
    case 4:
      return `playhead: ${details.playhead_position ?? details.playback?.playhead_position ?? 0}s • reason: ${details.reason || ""} • paused: ${details.pause_duration_seconds || 0}s`
    case 5:
      return `playhead: ${details.playhead_position ?? details.playback?.playhead_position ?? 0}s • reason: ${details.reason || ""} • completion: ${details.completion_percentage || 0}%`
    case 6:
      return `reason: ${details.reason || ""} • new: ${details.new_content?.title || ""}`
    default: {
      const parts: string[] = []
      if (details.content?.title) parts.push(`title: ${details.content.title}`)
      if (details.content?.platform) parts.push(`platform: ${details.content.platform}`)
      if (details.reason) parts.push(`reason: ${details.reason}`)
      return parts.join(" • ") || "-"
    }
  }
}

/**
 * Flatten a single Router Event record into an object keyed by column keys
 */
export function flattenRouterEvent(
  record: any,
  options: {
    timezone: string
    formatTimestamps: boolean
    typeNamesMap?: Map<number, string>
  }
): Record<string, any> {
  const details = typeof record.details === "string" ? safeJsonParse(record.details) : (record.details || {})
  const typeId = typeof record.type === "number" ? record.type : parseInt(record.type || "0", 10)
  const typeName =
    options.typeNamesMap?.get(typeId) ||
    DEFAULT_ROUTER_EVENT_TYPES.find((t) => t.type === typeId)?.name ||
    `TYPE_${typeId}`

  const timestampStr = options.formatTimestamps
    ? formatTimestamp(record.timestamp, options.timezone)
    : String(record.timestamp || "")

  const createdAtStr = options.formatTimestamps && record.created_at
    ? formatTimestamp(record.created_at, options.timezone)
    : String(record.created_at || "")

  const summary = formatRouterDetails(details, typeId, record.sub_device_id || null)

  // Extract nested properties
  const devDetails = details.device_details || {}
  const devCtx = details.device_context || {}
  const content = details.content || {}

  const ip = devDetails.ip || details.ip || details.client_ip || devCtx.source_ip || devCtx.ip_address || ""
  const mac = devDetails.mac || details.mac || details.client_mac || details.device_mac || ""
  const hostname = devDetails.hostname || details.hostname || devCtx.hostname || ""
  const iface = devDetails.iface || details.iface || ""
  const domain = details.domain || content.ad_domain || ""
  const domainCategory = details.domain_category || ""
  const trafficBytes =
    details.traffic_bytes_delta ??
    details.bytes_transferred ??
    details.bytes_delta_30s ??
    details.total_bytes_session ??
    details.bytes ??
    ""
  const durationSec =
    details.session_duration_sec ??
    details.connected_duration_sec ??
    details.duration_sec ??
    ""
  const youtubeTitle = content.title || content.video_id || ""

  return {
    id: String(record.id || ""),
    timestamp: timestampStr,
    device_id: String(record.device_id || ""),
    sub_device_id: record.sub_device_id ? String(record.sub_device_id) : "",
    type: typeId,
    type_name: typeName,
    summary,
    ip,
    mac,
    hostname,
    iface,
    domain,
    domain_category: domainCategory,
    traffic_bytes: trafficBytes !== "" ? Number(trafficBytes) : "",
    duration_sec: durationSec !== "" ? Number(durationSec) : "",
    youtube_title: youtubeTitle,
    created_at: createdAtStr,
    dedupe_key: record.dedupe_key ? String(record.dedupe_key) : "",
    raw_details: JSON.stringify(details),
  }
}

/**
 * Flatten a single Playback Event record into an object keyed by column keys
 */
export function flattenPlaybackEvent(
  record: any,
  options: {
    timezone: string
    formatTimestamps: boolean
    typeNamesMap?: Map<number, string>
  }
): Record<string, any> {
  const details = typeof record.details === "string" ? safeJsonParse(record.details) : (record.details || {})
  const typeId = typeof record.type === "number" ? record.type : parseInt(record.type || "0", 10)
  const typeName =
    options.typeNamesMap?.get(typeId) ||
    PLAYBACK_EVENT_TYPE_NAMES[typeId] ||
    `TYPE_${typeId}`

  const timestampStr = options.formatTimestamps
    ? formatTimestamp(record.timestamp, options.timezone)
    : String(record.timestamp || "")

  const createdAtStr = options.formatTimestamps && record.created_at
    ? formatTimestamp(record.created_at, options.timezone)
    : String(record.created_at || "")

  const summary = getPlaybackSummary(details, typeId)

  const content = details.content || {}
  const playback = details.playback || {}
  const devCtx = details.device_context || {}
  const hhCtx = details.household_context || {}
  const userCtx = details.user_context || {}

  const playhead =
    playback.playhead_position ??
    details.playhead_position ??
    ""
  const volume =
    playback.volume_level ??
    details.volume_level ??
    ""

  return {
    id: String(record.id || ""),
    timestamp: timestampStr,
    device_id: String(record.device_id || ""),
    type: typeId,
    type_name: typeName,
    summary,
    platform: content.platform || "",
    title: content.title || "",
    genre: content.genre || "",
    audio_language: content.audio_language || "",
    content_type: content.content_type || "",
    content_domain: content.domain || "",
    playhead_position: playhead !== "" ? Number(playhead) : "",
    bitrate: playback.bitrate || "",
    volume_level: volume !== "" ? Number(volume) : "",
    target_hostname: devCtx.hostname || "",
    target_device_type: devCtx.device_type || "",
    target_os: devCtx.os || "",
    target_ip: devCtx.ip_address || "",
    hhid: hhCtx.hhid || "",
    member_id: userCtx.member_id || "",
    reason: details.reason || "",
    created_at: createdAtStr,
    raw_details: JSON.stringify(details),
  }
}

function safeJsonParse(val: string): any {
  try {
    return JSON.parse(val)
  } catch {
    return {}
  }
}

/**
 * Generate CSV string from rows with RFC4180 escaping and UTF-8 BOM
 */
export function generateCsvString(
  rows: Record<string, any>[],
  columnDefs: ExportColumnDef[],
  selectedColumnKeys?: string[]
): string {
  const activeColumns = selectedColumnKeys && selectedColumnKeys.length > 0
    ? columnDefs.filter((col) => selectedColumnKeys.includes(col.key))
    : columnDefs.filter((col) => col.defaultSelected)

  const headers = activeColumns.map((c) => escapeCsvCell(c.label))
  const lines: string[] = [headers.join(",")]

  for (const row of rows) {
    const values = activeColumns.map((c) => {
      const val = row[c.key]
      if (val === undefined || val === null) return '""'
      return escapeCsvCell(String(val))
    })
    lines.push(values.join(","))
  }

  // Prepend UTF-8 BOM for Microsoft Excel compatibility
  return "\uFEFF" + lines.join("\r\n")
}

function escapeCsvCell(cell: string): string {
  if (cell.includes(",") || cell.includes('"') || cell.includes("\n") || cell.includes("\r")) {
    return `"${cell.replace(/"/g, '""')}"`
  }
  return `"${cell}"`
}

/**
 * Generate XLSX Buffer from rows with auto column widths
 */
export function generateXlsxBuffer(
  rows: Record<string, any>[],
  columnDefs: ExportColumnDef[],
  sheetName: string,
  selectedColumnKeys?: string[]
): Uint8Array {
  const activeColumns = selectedColumnKeys && selectedColumnKeys.length > 0
    ? columnDefs.filter((col) => selectedColumnKeys.includes(col.key))
    : columnDefs.filter((col) => col.defaultSelected)

  // Map rows to display headers
  const exportData = rows.map((row) => {
    const formattedObj: Record<string, any> = {}
    for (const col of activeColumns) {
      formattedObj[col.label] = row[col.key] ?? ""
    }
    return formattedObj
  })

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(exportData)

  // Auto calculate column widths
  const colWidths = activeColumns.map((col) => {
    let maxLen = col.label.length
    for (let i = 0; i < Math.min(rows.length, 50); i++) {
      const val = String(rows[i][col.key] ?? "")
      if (val.length > maxLen) {
        maxLen = val.length
      }
    }
    return { wch: Math.min(Math.max(maxLen + 2, 10), 50) }
  })
  ws["!cols"] = colWidths

  XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31))
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" })
  return new Uint8Array(buf)
}
