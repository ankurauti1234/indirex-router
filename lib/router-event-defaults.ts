export interface RouterFieldRule {
  id: string
  field: string
  operator: "equals" | "contains" | "not_equals" | "is_empty" | "gt" | "lt"
  value: string
  display_text: string
  badge_color?: "default" | "warning" | "destructive" | "success" | "info"
  enabled: boolean
}

export interface RouterEventTypeMeta {
  type: number
  name: string
  description: string
  template: string
  structure: any
  sample: any
  field_rules: RouterFieldRule[]
}

export const DEFAULT_ROUTER_EVENT_TYPES: RouterEventTypeMeta[] = [
  {
    type: 1,
    name: "DEVICE_CONNECT",
    description: "Client joined Wi-Fi or LAN network",
    template: "[{device_details.iface}] connected: {device_details.hostname} ({device_details.ip}) • MAC: {device_details.mac}",
    structure: {
      device_details: {
        event: "connected",
        mac: "00:E0:4C:4A:2E:20",
        ip: "192.168.8.108",
        iface: "ra0",
        hostname: "DJ"
      }
    },
    sample: {
      device_details: {
        event: "connected",
        mac: "00:E0:4C:4A:2E:20",
        ip: "192.168.8.108",
        iface: "ra0",
        hostname: "DJ"
      }
    },
    field_rules: [
      {
        id: "rule-type1-iface-ra0",
        field: "device_details.iface",
        operator: "equals",
        value: "ra0",
        display_text: "2.4GHz Wi-Fi",
        badge_color: "info",
        enabled: true
      },
      {
        id: "rule-type1-iface-rax0",
        field: "device_details.iface",
        operator: "equals",
        value: "rax0",
        display_text: "5GHz Wi-Fi",
        badge_color: "success",
        enabled: true
      },
      {
        id: "rule-type1-iface-lan",
        field: "device_details.iface",
        operator: "equals",
        value: "lan",
        display_text: "Wired LAN",
        badge_color: "default",
        enabled: true
      }
    ]
  },
  {
    type: 2,
    name: "DEVICE_DISCONNECT",
    description: "Client inactive for >15s after previous connection",
    template: "disconnected: {device_details.hostname} ({device_details.mac}) • duration: {device_details.connected_duration_sec}s",
    structure: {
      device_details: {
        event: "disconnected",
        mac: "00:E0:4C:4A:2E:20",
        ip: "192.168.8.108",
        connected_duration_sec: 3600,
        hostname: "DJ"
      }
    },
    sample: {
      device_details: {
        event: "disconnected",
        mac: "00:E0:4C:4A:2E:20",
        ip: "192.168.8.108",
        connected_duration_sec: 3600,
        hostname: "DJ"
      }
    },
    field_rules: [
      {
        id: "rule-type2-disconn",
        field: "device_details.event",
        operator: "equals",
        value: "disconnected",
        display_text: "Disconnected",
        badge_color: "warning",
        enabled: true
      }
    ]
  },
  {
    type: 3,
    name: "DOMAIN_ACTIVITY",
    description: "DNS query to whitelisted platform domain with traffic metrics",
    template: "[{domain_activity.platform}] {domain_activity.domain} • ip: {domain_activity.source_ip} • bitrate: {traffic_metrics.bitrate_mbps} Mbps",
    structure: {
      domain_activity: {
        platform: "YouTube",
        platform_canonical: "youtube",
        category: "OTT",
        domain: "www.youtube.com",
        matched_domain: "youtube.com",
        classifier_reason: "acam_suffix:youtube.com",
        source_ip: "192.168.8.108",
        source_ip_v4: "192.168.8.108",
        service_category: "AVOD",
        observed_ts: "2026-09-24T11:25:14",
        signal_strength: "primary",
        platform_lock_reason: "new_lock"
      },
      device_details: {
        event: "connected",
        mac: "00:E0:4C:4A:2E:20",
        hostname: "DJ",
        ip_v4: "192.168.8.108",
        ip: "192.168.8.108"
      },
      traffic_metrics: {
        window_sec: 30,
        bytes_total: 524288,
        bytes_down: 500000,
        bytes_up: 24288,
        packets_total: 400,
        packets_down: 350,
        packets_up: 50,
        bitrate_bps: 139810,
        bitrate_mbps: 0.1398,
        mb_total_binary: 0.5,
        avg_packet_size_bytes: 1310.72,
        flow_count: 5,
        flow_source: "conntrack",
        attribution_mode: "device_platform_lock",
        reset_reason: "continuous"
      }
    },
    sample: {
      domain_activity: {
        platform: "YouTube",
        platform_canonical: "youtube",
        category: "OTT",
        domain: "www.youtube.com",
        matched_domain: "youtube.com",
        classifier_reason: "acam_suffix:youtube.com",
        source_ip: "192.168.8.108",
        source_ip_v4: "192.168.8.108",
        service_category: "AVOD",
        observed_ts: "2026-09-24T11:25:14",
        signal_strength: "primary",
        platform_lock_reason: "new_lock"
      },
      device_details: {
        event: "connected",
        mac: "00:E0:4C:4A:2E:20",
        hostname: "DJ",
        ip_v4: "192.168.8.108",
        ip: "192.168.8.108"
      },
      traffic_metrics: {
        window_sec: 30,
        bytes_total: 524288,
        bytes_down: 500000,
        bytes_up: 24288,
        packets_total: 400,
        packets_down: 350,
        packets_up: 50,
        bitrate_bps: 139810,
        bitrate_mbps: 0.1398,
        mb_total_binary: 0.5,
        avg_packet_size_bytes: 1310.72,
        flow_count: 5,
        flow_source: "conntrack",
        attribution_mode: "device_platform_lock",
        reset_reason: "continuous"
      }
    },
    field_rules: [
      {
        id: "rule-type3-primary",
        field: "domain_activity.signal_strength",
        operator: "equals",
        value: "primary",
        display_text: "Primary Domain",
        badge_color: "success",
        enabled: true
      }
    ]
  },
  {
    type: 4,
    name: "TV_EVENT",
    description: "ADB-derived Smart TV state telemetry (~every 3s per TV slot)",
    template: "[TV State] {device_details.event} • ip: {device_details.ip} • slot: {sub_device_id}",
    structure: {
      device_details: {
        ip: "192.168.8.175",
        mac: "REPLACE_WITH_MAC",
        event: "connected",
        hostname: "TV_01"
      },
      domain_activity: {
        domain: "youtube.com",
        category: "OTT",
        platform: {
          platform: "youtube",
          title: "Some Video Title",
          original_title: "Some Video Title",
          channel: "YouTube",
          service_category: "AVOD",
          current_state: "PLAYING",
          content_id: "dQw4w9WgXcQ"
        },
        source_ip: "192.168.8.175",
        service_category: "AVOD"
      }
    },
    sample: {
      device_details: {
        ip: "192.168.8.175",
        mac: "REPLACE_WITH_MAC",
        event: "connected",
        hostname: "TV_01"
      },
      domain_activity: {
        domain: "youtube.com",
        category: "OTT",
        platform: {
          platform: "youtube",
          title: "Some Video Title",
          original_title: "Some Video Title",
          channel: "YouTube",
          service_category: "AVOD",
          current_state: "PLAYING",
          content_id: "dQw4w9WgXcQ"
        },
        source_ip: "192.168.8.175",
        service_category: "AVOD"
      }
    },
    field_rules: [
      {
        id: "rule-type4-playing",
        field: "domain_activity.platform.current_state",
        operator: "equals",
        value: "PLAYING",
        display_text: "Media Playing",
        badge_color: "success",
        enabled: true
      },
      {
        id: "rule-type4-off",
        field: "device_details.event",
        operator: "equals",
        value: "off",
        display_text: "TV Off",
        badge_color: "destructive",
        enabled: true
      }
    ]
  },
  {
    type: 5,
    name: "SESSION_END",
    description: "Platform streaming session ended summary",
    template: "[{session_summary.platform}] duration: {session_summary.duration_sec}s • data: {traffic_metrics.mb_total_binary} MB",
    structure: {
      session_id: "11111111-2222-4333-8444-555555555555",
      device_details: {
        event: "session_end",
        mac: "AA:BB:CC:DD:EE:FF",
        hostname: "Galaxy-S21",
        ip_v4: "192.168.8.100",
        ip_v6: "fe80::1",
        ip: "192.168.8.100"
      },
      session_summary: {
        platform: "youtube.com",
        start_ts: "2026-09-24T10:00:00.000Z",
        end_ts: "2026-09-24T10:30:00.000Z",
        duration_sec: 1800,
        total_domains: 5,
        total_queries: 42,
        unique_domains: ["youtube.com", "googlevideo.com", "ytimg.com"]
      },
      traffic_metrics: {
        window_sec: 1800,
        bytes_total: 52428800,
        bytes_down: 50000000,
        bytes_up: 2428800,
        packets_total: 40000,
        packets_down: 35000,
        packets_up: 5000,
        bitrate_bps: 233016,
        bitrate_mbps: 0.23,
        mb_total_binary: 50.0,
        avg_packet_size_bytes: 1310,
        flow_count: 12,
        flow_source: "conntrack",
        attribution_mode: "by_ip",
        reset_reason: "session_end"
      }
    },
    sample: {
      session_id: "11111111-2222-4333-8444-555555555555",
      device_details: {
        event: "session_end",
        mac: "AA:BB:CC:DD:EE:FF",
        hostname: "Galaxy-S21",
        ip_v4: "192.168.8.100",
        ip_v6: "fe80::1",
        ip: "192.168.8.100"
      },
      session_summary: {
        platform: "youtube.com",
        start_ts: "2026-09-24T10:00:00.000Z",
        end_ts: "2026-09-24T10:30:00.000Z",
        duration_sec: 1800,
        total_domains: 5,
        total_queries: 42,
        unique_domains: ["youtube.com", "googlevideo.com", "ytimg.com"]
      },
      traffic_metrics: {
        window_sec: 1800,
        bytes_total: 52428800,
        bytes_down: 50000000,
        bytes_up: 2428800,
        packets_total: 40000,
        packets_down: 35000,
        packets_up: 5000,
        bitrate_bps: 233016,
        bitrate_mbps: 0.23,
        mb_total_binary: 50.0,
        avg_packet_size_bytes: 1310,
        flow_count: 12,
        flow_source: "conntrack",
        attribution_mode: "by_ip",
        reset_reason: "session_end"
      }
    },
    field_rules: [
      {
        id: "rule-type5-ended",
        field: "device_details.event",
        operator: "equals",
        value: "session_end",
        display_text: "Session Ended",
        badge_color: "info",
        enabled: true
      }
    ]
  },
  {
    type: 6,
    name: "MEMBER_REGISTRATION",
    description: "Member to device mapping registration",
    template: "Member: {member_name} ({member_id}) • registered devices count: {devices.length}",
    structure: {
      member_id: "m_001",
      member_name: "Deepak",
      devices: [
        { mac: "AA:BB:CC:DD:EE:FF", hostname: "Galaxy-S21", device_type: "phone" }
      ]
    },
    sample: {
      member_id: "m_001",
      member_name: "Deepak",
      devices: [
        { mac: "AA:BB:CC:DD:EE:FF", hostname: "Galaxy-S21", device_type: "phone" }
      ]
    },
    field_rules: []
  },
  {
    type: 7,
    name: "CONSUMER_JOINED",
    description: "Network consumer device exceeded traffic threshold (50KB/30s)",
    template: "[Joined] ip: {ip} • MAC: {mac} • 30s bytes: {bytes_delta_30s}",
    structure: {
      ip: "192.168.8.100",
      mac: "AA:BB:CC:DD:EE:FF",
      bytes: 125000,
      bytes_delta_30s: 125000,
      bw_event: "consumer_joined"
    },
    sample: {
      ip: "192.168.8.100",
      mac: "AA:BB:CC:DD:EE:FF",
      bytes: 125000,
      bytes_delta_30s: 125000,
      bw_event: "consumer_joined"
    },
    field_rules: [
      {
        id: "rule-type7-joined",
        field: "bw_event",
        operator: "equals",
        value: "consumer_joined",
        display_text: "Consumer Joined",
        badge_color: "success",
        enabled: true
      }
    ]
  },
  {
    type: 8,
    name: "CONSUMER_HEARTBEAT",
    description: "Periodic 30s bandwidth consumption heartbeat for active devices",
    template: "[Heartbeat] active count: {active_count} consumers",
    structure: {
      bw_event: "active_heartbeat",
      consumers: [
        {
          ip: "192.168.8.108",
          mac: "00:e0:4c:4a:2e:20",
          hostname: "DJ",
          total_bytes: 45432460,
          duration_sec: 257,
          bytes_delta_30s: 429717
        }
      ],
      active_count: 1
    },
    sample: {
      bw_event: "active_heartbeat",
      consumers: [
        {
          ip: "192.168.8.108",
          mac: "00:e0:4c:4a:2e:20",
          hostname: "DJ",
          total_bytes: 45432460,
          duration_sec: 257,
          bytes_delta_30s: 429717
        }
      ],
      active_count: 1
    },
    field_rules: []
  },
  {
    type: 9,
    name: "CONSUMER_LEFT",
    description: "Network consumer device dropped below bandwidth threshold",
    template: "[Left] ip: {ip} • MAC: {mac} • total session bytes: {total_bytes_session}",
    structure: {
      ip: "192.168.8.100",
      mac: "AA:BB:CC:DD:EE:FF",
      bytes: 30000,
      duration_sec: 62,
      total_bytes_session: 57512,
      bw_event: "consumer_left"
    },
    sample: {
      ip: "192.168.8.100",
      mac: "AA:BB:CC:DD:EE:FF",
      bytes: 30000,
      duration_sec: 62,
      total_bytes_session: 57512,
      bw_event: "consumer_left"
    },
    field_rules: [
      {
        id: "rule-type9-left",
        field: "bw_event",
        operator: "equals",
        value: "consumer_left",
        display_text: "Consumer Left",
        badge_color: "warning",
        enabled: true
      }
    ]
  },
  {
    type: 10,
    name: "YOUTUBE_CONTENT",
    description: "Video detected by MITM interceptor (/watch?v= or /shorts/)",
    template: "[YouTube] {content.title} • video_id: {content.video_id} • ip: {device_context.source_ip}",
    structure: {
      content: {
        video_id: "dQw4w9WgXcQ",
        title: "Rick Astley - Never Gonna Give You Up",
        url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        platform: "youtube",
        content_type: "video",
        detected_at: "2026-09-24T10:00:00.000Z"
      },
      device_context: { source_ip: "192.168.8.100", router_id: "RM0008" }
    },
    sample: {
      content: {
        video_id: "dQw4w9WgXcQ",
        title: "Rick Astley - Never Gonna Give You Up",
        url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        platform: "youtube",
        content_type: "video",
        detected_at: "2026-09-24T10:00:00.000Z"
      },
      device_context: { source_ip: "192.168.8.100", router_id: "RM0008" }
    },
    field_rules: [
      {
        id: "rule-type10-yt",
        field: "content.platform",
        operator: "equals",
        value: "youtube",
        display_text: "YouTube Video",
        badge_color: "info",
        enabled: true
      }
    ]
  },
  {
    type: 11,
    name: "YOUTUBE_AD",
    description: "Ad-domain SNI hit (domain-hit counter for ad requests)",
    template: "[YouTube Ad] {content.ad_domain} • type: {content.type} • ip: {device_context.source_ip}",
    structure: {
      content: {
        ad_domain: "googleads.g.doubleclick.net",
        detected_at: "2026-09-24T10:00:05.000Z",
        type: "ad_request"
      },
      device_context: { source_ip: "192.168.8.100", router_id: "RM0008" }
    },
    sample: {
      content: {
        ad_domain: "googleads.g.doubleclick.net",
        detected_at: "2026-09-24T10:00:05.000Z",
        type: "ad_request"
      },
      device_context: { source_ip: "192.168.8.100", router_id: "RM0008" }
    },
    field_rules: [
      {
        id: "rule-type11-ad",
        field: "content.type",
        operator: "equals",
        value: "ad_request",
        display_text: "Ad Request",
        badge_color: "warning",
        enabled: true
      }
    ]
  }
]

export function getNestedProp(obj: any, path: string): any {
  if (!obj || typeof obj !== "object") return undefined
  const parts = path.split(".")
  let current = obj
  for (const part of parts) {
    if (current && typeof current === "object" && part in current) {
      current = current[part]
    } else {
      return undefined
    }
  }
  return current
}

export function formatRouterDetails(
  details: any,
  typeId: number,
  subDeviceId: string | null,
  customTemplate?: string,
  fieldRules?: RouterFieldRule[]
): string {
  if (!details || typeof details !== "object") return "-"

  if (Array.isArray(fieldRules)) {
    for (const rule of fieldRules) {
      if (!rule.enabled || !rule.field) continue
      const val = getNestedProp(details, rule.field)
      if (val !== undefined && val !== null) {
        const strVal = String(val).trim().toLowerCase()
        const target = (rule.value || "").trim().toLowerCase()
        let match = false
        if (rule.operator === "equals") match = strVal === target
        else if (rule.operator === "not_equals") match = strVal !== target
        else if (rule.operator === "contains") match = strVal.includes(target)
        else if (rule.operator === "is_empty") match = strVal === "" || strVal === "null"
        else if (rule.operator === "gt") match = Number(val) > Number(rule.value)
        else if (rule.operator === "lt") match = Number(val) < Number(rule.value)

        if (match && rule.display_text) {
          // match rule display text
        }
      }
    }
  }

  if (typeId === 4) {
    const dev = details.device_details || {}
    const dom = details.domain_activity || {}
    const slotStr = subDeviceId ? `TV ${subDeviceId}` : (dev.hostname || "TV")
    
    const platformVal = dom.platform
    if (platformVal && typeof platformVal === "object" && platformVal.platform) {
      const pName = platformVal.platform
      const title = platformVal.title || platformVal.original_title || ""
      const state = platformVal.current_state || "ACTIVE"
      return `[${pName}] ${title || state} • ${slotStr} (${dev.ip || dom.source_ip || ""})`
    }
    
    const eventState = dev.event || "state"
    return `[TV State] ${eventState} • ${slotStr} (${dev.ip || ""})`
  }

  if (typeId === 1) {
    const dev = details.device_details || {}
    const host = dev.hostname || dev.mac || "Device"
    const iface = dev.iface ? ` on ${dev.iface}` : ""
    return `[connected] ${host} (${dev.ip || ""})${iface}`
  }

  if (typeId === 2) {
    const dev = details.device_details || {}
    const host = dev.hostname || dev.mac || "Device"
    const duration = dev.connected_duration_sec ? ` • duration: ${dev.connected_duration_sec}s` : ""
    return `[disconnected] ${host} (${dev.mac || ""})${duration}`
  }

  if (typeId === 3) {
    const dom = details.domain_activity || {}
    const traf = details.traffic_metrics || {}
    const pName = dom.platform || dom.matched_domain || "Domain"
    const bitrate = traf.bitrate_mbps ? ` • ${traf.bitrate_mbps} Mbps` : ""
    return `[${pName}] ${dom.domain || ""} • ip: ${dom.source_ip || ""}${bitrate}`
  }

  if (typeId === 5) {
    const summary = details.session_summary || {}
    const traf = details.traffic_metrics || summary.traffic_metrics || {}
    const pName = summary.platform || "Session"
    const mb = traf.mb_total_binary !== undefined ? ` • ${traf.mb_total_binary} MB` : ""
    return `[Session End] ${pName} • duration: ${summary.duration_sec || 0}s${mb}`
  }

  if (typeId === 6) {
    const name = details.member_name || details.member_id || "Member"
    const devCount = Array.isArray(details.devices) ? details.devices.length : 0
    return `Member Registered: ${name} • ${devCount} device(s)`
  }

  if (typeId === 7) {
    const bytes = details.bytes_delta_30s || details.bytes || 0
    const kb = (bytes / 1024).toFixed(1)
    return `[Consumer Joined] IP: ${details.ip || "-"} (${details.hostname || details.mac || ""}) • ${kb} KB/30s`
  }
  if (typeId === 8) {
    const consumers = Array.isArray(details.consumers) ? details.consumers : []
    const count = details.active_count || consumers.length
    const topItem = consumers[0]
    const top = topItem ? ` • top: ${topItem.hostname || topItem.ip} (${((topItem.bytes_delta_30s || 0)/1024).toFixed(0)} KB)` : ""
    return `[Heartbeat] ${count} active consumer(s)${top}`
  }
  if (typeId === 9) {
    const total = details.total_bytes_session || details.bytes || 0
    const mb = (total / (1024 * 1024)).toFixed(2)
    return `[Consumer Left] IP: ${details.ip || "-"} • session total: ${mb} MB (${details.duration_sec || 0}s)`
  }

  if (typeId === 10) {
    const content = details.content || {}
    const ctx = details.device_context || {}
    return `[YouTube] ${content.title || content.video_id || "Video"} • IP: ${ctx.source_ip || "-"}`
  }

  if (typeId === 11) {
    const content = details.content || {}
    const ctx = details.device_context || {}
    return `[YouTube Ad] ${content.ad_domain || "Ad domain"} • IP: ${ctx.source_ip || "-"}`
  }

  if (customTemplate) {
    let output = customTemplate
    const braceRegex = /\{([^}]+)\}/g
    output = output.replace(braceRegex, (_, path) => {
      const value = getNestedProp(details, path)
      return value !== undefined && value !== null ? String(value) : ""
    })
    return output.trim()
  }

  const parts: string[] = []
  Object.entries(details).forEach(([key, val]) => {
    if (typeof val !== "object" && val !== null) {
      parts.push(`${key}: ${val}`)
    }
  })
  return parts.slice(0, 3).join(" • ") || JSON.stringify(details)
}
