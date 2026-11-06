/**
 * Universal dynamic template and rule evaluation engine for Router & Telemetry events.
 * Eliminates hardcoded switch-case statements and enables dynamic DB-driven formatting.
 */

export interface DynamicFieldRule {
  id: string
  field: string
  operator: "equals" | "contains" | "not_equals" | "is_empty" | "gt" | "lt"
  value: string
  display_text: string
  badge_color?: "default" | "warning" | "destructive" | "success" | "info"
  enabled: boolean
}

/**
 * Safely resolves nested property by dot path (e.g. "device_details.hostname", "member_details.length")
 */
export function getNestedProperty(obj: any, path: string): any {
  if (!obj || typeof obj !== "object") return undefined
  if (!path) return undefined

  const resolvePath = (target: any, p: string) => {
    const parts = p.split(".")
    let curr = target

    for (let i = 0; i < parts.length; i++) {
      const key = parts[i]
      if (curr === null || curr === undefined) return undefined

      // Support array length shortcut
      if (Array.isArray(curr) && key === "length") {
        return curr.length
      }

      // Support array numeric index
      if (Array.isArray(curr) && !isNaN(Number(key))) {
        curr = curr[Number(key)]
        continue
      }

      curr = curr[key]
    }
    return curr
  }

  const direct = resolvePath(obj, path)
  if (direct !== undefined) return direct

  // Fallback for wearable fields residing inside details or root
  if (obj.details && typeof obj.details === "object") {
    const insideDetails = resolvePath(obj.details, path)
    if (insideDetails !== undefined) return insideDetails
  }

  // Fallback aliases for router sessions (session_summary <-> session)
  if (path.startsWith("session_summary.")) {
    const fallbackKey = path.replace(/^session_summary\./, "session.")
    const fallbackVal = resolvePath(obj, fallbackKey)
    if (fallbackVal !== undefined) return fallbackVal
  } else if (path.startsWith("session.")) {
    const fallbackKey = path.replace(/^session\./, "session_summary.")
    const fallbackVal = resolvePath(obj, fallbackKey)
    if (fallbackVal !== undefined) return fallbackVal
  }

  // Fallback for traffic_metrics.mb_total_binary from session.bytes_total
  if (path === "traffic_metrics.mb_total_binary" || path === "traffic_metrics.bytes_total") {
    const bytes = obj.session?.bytes_total ?? obj.session_summary?.bytes_total
    if (typeof bytes === "number" && bytes > 0) {
      return path === "traffic_metrics.mb_total_binary" ? parseFloat((bytes / (1024 * 1024)).toFixed(2)) : bytes
    }
  }

  return undefined
}

export function setNestedProperty(obj: any, path: string, value: any): void {
  if (!obj || typeof obj !== "object" || !path) return
  const parts = path.split(".")
  let current = obj
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]
    if (!current[part] || typeof current[part] !== "object") {
      current[part] = {}
    }
    current = current[part]
  }
  current[parts[parts.length - 1]] = value
}

/**
 * Formats byte values into readable strings (B, KB, MB, GB)
 */
export function formatBytes(bytes: number): string {
  if (isNaN(bytes) || bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}

/**
 * Evaluates whether an event details payload satisfies a field rule condition
 */
export function evaluateRuleCondition(details: any, rule: DynamicFieldRule): boolean {
  if (!rule || !rule.enabled || !rule.field) return false

  const rawVal = getNestedProperty(details, rule.field)

  if (rule.operator === "is_empty") {
    return rawVal === undefined || rawVal === null || rawVal === "" || (Array.isArray(rawVal) && rawVal.length === 0)
  }

  if (rawVal === undefined || rawVal === null) return false

  const strVal = String(rawVal).trim().toLowerCase()
  const targetVal = String(rule.value || "").trim().toLowerCase()

  switch (rule.operator) {
    case "equals":
      return strVal === targetVal
    case "not_equals":
      return strVal !== targetVal
    case "contains":
      return strVal.includes(targetVal)
    case "gt": {
      const numRaw = parseFloat(strVal)
      const numTarget = parseFloat(targetVal)
      return !isNaN(numRaw) && !isNaN(numTarget) && numRaw > numTarget
    }
    case "lt": {
      const numRaw = parseFloat(strVal)
      const numTarget = parseFloat(targetVal)
      return !isNaN(numRaw) && !isNaN(numTarget) && numRaw < numTarget
    }
    default:
      return false
  }
}

/**
 * Evaluates an array of rules against event details and returns matched badges
 */
export function getMatchedRuleBadges(details: any, rules?: DynamicFieldRule[]): DynamicFieldRule[] {
  if (!rules || !Array.isArray(rules) || !details) return []
  return rules.filter(rule => evaluateRuleCondition(details, rule))
}

/**
 * Formats event details by interpolating template tokens like `{path.to.key}` and `[path.to.key]`.
 * If no template is provided or interpolation produces empty string, builds a clean intelligent fallback.
 */
export function renderEventSummary(
  details: any,
  template?: string | null,
  rules?: DynamicFieldRule[],
  typeId?: number
): string {
  if (!details || typeof details !== "object") return "-"

  // Clone details so we can safely apply rule value overrides
  const workingDetails = JSON.parse(JSON.stringify(details))

  // Apply active rule condition mutations to workingDetails
  // Exclude content, title, and key identifier fields from being mutated so actual entity values (e.g. song titles, SSIDs) are preserved
  const protectedFields = new Set([
    "content",
    "title",
    "content.title",
    "song",
    "device_id",
    "sub_device_id",
    "ssid",
    "mac",
    "ip",
    "device_ip",
    "device_mac",
    "device_hostname",
  ])

  if (Array.isArray(rules) && rules.length > 0) {
    rules.forEach((r) => {
      if (!protectedFields.has(r.field) && evaluateRuleCondition(workingDetails, r)) {
        setNestedProperty(workingDetails, r.field, r.display_text)
      }
    })
  }

  let output = (template && typeof template === "string") ? template.trim() : ""

  if (output) {
    // 1. Resolve curly brace bindings e.g. {playback.playhead_position}
    output = output.replace(/\{([a-zA-Z0-9_.]+)\}/g, (_, key) => {
      let val = getNestedProperty(workingDetails, key)
      if (val === undefined || val === null || String(val).trim() === "") {
        if (key === "content" && (typeId === 1 || workingDetails.content_type === "song")) {
          val = workingDetails.song || workingDetails.title || "Song Detected"
        } else {
          return ""
        }
      }
      if (typeof val === "object") return Array.isArray(val) ? `[${val.length} items]` : JSON.stringify(val)
      return String(val)
    })

    // 2. Resolve bracketed bindings e.g. [content.platform]
    output = output.replace(/\[([a-zA-Z0-9_.]+)\]/g, (fullMatch, key) => {
      // If it contains a dot or is a direct property in workingDetails, evaluate it
      if (key.includes(".") || (workingDetails && key in workingDetails)) {
        const val = getNestedProperty(workingDetails, key)
        if (val !== undefined && val !== null && String(val).trim()) {
          return `[${String(val)}]`
        }
        return ""
      }
      // Otherwise it was an already-resolved tag like [YouTube] or a category badge, keep it intact
      return fullMatch
    })

    // 3. Fallback resolve standalone common keywords e.g. "title", "platform", "genre", "reason"
    const commonKeys = ["title", "platform", "genre", "reason"]
    commonKeys.forEach((key) => {
      const regex = new RegExp(`\\b${key}\\b`, "g")
      if (regex.test(output)) {
        const val =
          getNestedProperty(workingDetails, `content.${key}`) ??
          getNestedProperty(workingDetails, `playback.${key}`) ??
          getNestedProperty(workingDetails, `session.${key}`) ??
          getNestedProperty(workingDetails, `session_summary.${key}`) ??
          getNestedProperty(workingDetails, key)
        if (val !== undefined && val !== null && String(val).trim()) {
          output = output.replace(regex, String(val))
        } else {
          output = output.replace(regex, "")
        }
      }
    })

    // 4. Clean up dangling empty labels and separators
    output = output
      .replace(/\bCompletion:\s*(%|\s|$)/gi, "")
      .replace(/\bBitrate:\s*(•|\s|$)/gi, "")
      .replace(/\bDownloaded:\s*(bytes|\s|$)/gi, "")
      .replace(/\bVolume:\s*(%|\s|$)/gi, "")
      .replace(/\bPlayhead:\s*(0s\s*•\s*)?/gi, "")
      .replace(/\bPaused:\s*s/gi, "")
      .replace(/•\s*duration:\s*s/gi, "")
      .replace(/\bduration:\s*s\b/gi, "")
      .replace(/•\s*end:\s*(•|$)/gi, "")
      .replace(/\bend:\s*(•|$)/gi, "")
      .replace(/•\s*data:\s*MB/gi, "")
      .replace(/\bdata:\s*MB\b/gi, "")
      .replace(/•\s*MB\b/gi, "")
      .replace(/\bMB\b/g, "")
      .replace(/\[\s*\]/g, "")
      .replace(/\(\s*\)/g, "")
      .replace(/\s*•\s*(?=•|$)/g, "")
      .replace(/^\s*•\s*/, "")
      .replace(/\s+/g, " ")
      .trim()

    if (output.length > 0 && output !== "•" && output !== "-" && output !== "[Session End]") {
      return output
    }
  }

  // Smart fallback when template is missing or evaluated to empty
  return buildIntelligentFallbackSummary(workingDetails, "", typeId)
}

/**
 * Generates an intuitive summary string by extracting recognizable entity names and metrics
 */
function buildIntelligentFallbackSummary(details: any, badgePrefix: string, typeId?: number): string {
  // Wearable Wi-Fi event
  if (details.wifi_status !== undefined || details.wifi_connected !== undefined || details.ssid !== undefined || details.wifi !== undefined) {
    const status = details.wifi_status || details.wifi || (details.details?.wifi ?? "ON")
    const ssid = details.ssid ? ` • SSID: ${details.ssid}` : ""
    const connState = details.wifi_connected !== undefined ? (details.wifi_connected ? " • Connected" : " • Disconnected") : ""
    return `${badgePrefix}[WiFi ${status}]${ssid}${connState}`.trim()
  }

  // Wearable Song match / Watermark
  if (details.content_type === "song" || (typeId === 1 && details.content)) {
    const song = details.content || "Song Detected"
    return `${badgePrefix}[Song] ${song} • Watermark Verified`.trim()
  }

  if (typeId === 2 && (details.content || details.details?.carrier)) {
    const watermark = details.content || "Heartbeat"
    return `${badgePrefix}[Listening] ${watermark} • Mic Active`.trim()
  }

  // Wearable Device Calibration / Registration
  if (typeId === 4 || details.calibration_summary || details.meter_id) {
    const status = details.status || details.calibration_summary?.registration || "Installed"
    const hh = details.hh_id ? `HH: ${details.hh_id}` : ""
    const member = details.member_id ? `Member: ${details.member_id}` : ""
    const serial = details.serial_no ? `Serial: ${details.serial_no}` : ""
    const battery = details.calibration_summary?.diagnostics?.battery_health?.percentage
      ? `Battery: ${details.calibration_summary.diagnostics.battery_health.percentage}`
      : ""
    const parts = [hh, member, serial, battery].filter(Boolean).join(" • ")
    return `${badgePrefix}[Registration ${status}] ${parts}`.trim()
  }

  // Check for router streaming session first
  const sess = details.session || details.session_summary
  if (sess && typeof sess === "object") {
    const p = sess.platform || sess.platform_canonical || sess.category || "Session"
    const dur = sess.duration_sec !== undefined ? ` • duration: ${sess.duration_sec}s` : ""
    const bytes = sess.bytes_total || (sess.bytes_down ? sess.bytes_down + sess.bytes_up : 0)
    const mb = bytes ? ` • ${formatBytes(bytes)}` : ""
    const reason = sess.end_reason ? ` • reason: ${sess.end_reason}` : ""
    return `${badgePrefix}[${p}]${dur}${mb}${reason}`.trim()
  }

  // If typeId is provided, use standard playback/router event mappings
  if (typeId === 1) {
    const title = details.content?.title || details.title || ""
    const platform = details.content?.platform || details.platform || ""
    const bitrate = details.playback?.bitrate ? ` (${details.playback.bitrate})` : ""
    const devType = details.device_context?.device_type ? ` • ${details.device_context.device_type}` : ""
    if (title) return `${badgePrefix}${platform ? `[${platform}] ` : ""}${title}${devType}${bitrate}`.trim()
  }

  if (typeId === 2) {
    const playhead = details.playback?.playhead_position ?? details.playhead_position
    const bitrate = details.playback?.bitrate ? ` • Bitrate: ${details.playback.bitrate}` : ""
    const bytes = details.playback?.bytes_downloaded ? ` • Downloaded: ${formatBytes(details.playback.bytes_downloaded)}` : ""
    return `${badgePrefix}Playhead: ${playhead ?? 0}s${bitrate}${bytes}`.trim()
  }

  if (typeId === 3 || typeId === 4 || typeId === 5) {
    const playhead = details.playback?.playhead_position ?? details.playhead_position ?? 0
    const reason = details.reason ? ` • Reason: ${details.reason}` : ""
    const completion = details.completion_percentage ? ` • Completion: ${details.completion_percentage}%` : ""
    const volume = details.volume_level ? ` • Volume: ${details.volume_level}%` : ""
    return `${badgePrefix}Playhead: ${playhead}s${reason}${completion}${volume}`.trim()
  }

  if (typeId === 6) {
    const newTitle = details.new_content?.title || details.title || "Content Changed"
    const reason = details.reason ? ` • Reason: ${details.reason}` : ""
    return `${badgePrefix}New: ${newTitle}${reason}`.trim()
  }

  if (typeId === 7) {
    return `${badgePrefix}TV Screen ON • ${details.device_context?.hostname || "Smart TV"}`
  }

  if (typeId === 8) {
    return `${badgePrefix}TV Screen OFF • ${details.device_context?.hostname || "Smart TV"}`
  }

  // Router domain activity
  const dom = details.domain_activity
  if (dom && typeof dom === "object") {
    const platform = typeof dom.platform === "string" ? dom.platform : (dom.platform?.platform || dom.matched_domain || "")
    const domain = dom.domain || ""
    const ip = dom.source_ip || details.device_details?.ip || ""
    const bitrate = details.traffic_metrics?.bitrate_mbps ? ` • ${details.traffic_metrics.bitrate_mbps} Mbps` : ""
    return `${badgePrefix}[${platform || "Domain"}] ${domain} • IP: ${ip}${bitrate}`.trim()
  }

  // Device connect / disconnect
  const dev = details.device_details
  if (dev && typeof dev === "object") {
    const host = dev.hostname || dev.mac || "Device"
    const state = dev.event || "event"
    const ip = dev.ip ? ` (${dev.ip})` : ""
    const iface = dev.iface ? ` on ${dev.iface}` : ""
    const duration = dev.connected_duration_sec ? ` • ${dev.connected_duration_sec}s` : ""
    return `${badgePrefix}[${state}] ${host}${ip}${iface}${duration}`.trim()
  }

  // Generic content fallback
  if (details.content?.title) {
    return `${badgePrefix}${details.content.title}`
  }

  // Key-value pairs fallback
  const pairs: string[] = []
  Object.entries(details).forEach(([k, v]) => {
    if (typeof v !== "object" && v !== null && pairs.length < 3) {
      pairs.push(`${k}: ${v}`)
    }
  })
  return pairs.length > 0 ? `${badgePrefix}${pairs.join(" • ")}` : JSON.stringify(details).slice(0, 80)
}

