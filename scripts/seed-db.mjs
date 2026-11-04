import { createClient } from "@supabase/supabase-js"
import dotenv from "dotenv"
dotenv.config({ path: ".env" })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env")
  process.exit(1)
}

const supabase = createClient(url, key)
const STORAGE_PREFIX = `${url}/storage/v1/object/public/router-device-assets/ott-icons/`

const ALL_15_PLATFORMS = [
  {
    key: "amazon-prime",
    name: "Amazon Prime Video",
    file_name: "amazon-prime.jpeg",
    icon_url: `${STORAGE_PREFIX}amazon-prime.jpeg`,
    category: "OTT",
    domain_patterns: ["primevideo.com", "amazonvideo.com", "pv-cdn.net"],
    is_active: true,
  },
  {
    key: "amazon",
    name: "Amazon",
    file_name: "amazon.jpeg",
    icon_url: `${STORAGE_PREFIX}amazon.jpeg`,
    category: "E-Commerce",
    domain_patterns: ["amazon.in", "amazon.com", "ssl-images-amazon.com", "media-amazon.com"],
    is_active: true,
  },
  {
    key: "blinkit",
    name: "Blinkit",
    file_name: "blinkit.jpeg",
    icon_url: `${STORAGE_PREFIX}blinkit.jpeg`,
    category: "Quick Commerce",
    domain_patterns: ["blinkit.com", "grofers.com"],
    is_active: true,
  },
  {
    key: "chatgpt",
    name: "ChatGPT",
    file_name: "chatgpt.jpeg",
    icon_url: `${STORAGE_PREFIX}chatgpt.jpeg`,
    category: "AI / Productivity",
    domain_patterns: ["chatgpt.com", "openai.com", "oaistatic.com", "oaiusercontent.com"],
    is_active: true,
  },
  {
    key: "facebook",
    name: "Facebook",
    file_name: "facebook.jpeg",
    icon_url: `${STORAGE_PREFIX}facebook.jpeg`,
    category: "Social Media",
    domain_patterns: ["facebook.com", "fbcdn.net", "meta.com"],
    is_active: true,
  },
  {
    key: "flipkart",
    name: "Flipkart",
    file_name: "flipkart.jpeg",
    icon_url: `${STORAGE_PREFIX}flipkart.jpeg`,
    category: "E-Commerce",
    domain_patterns: ["flipkart.com", "flixcart.com"],
    is_active: true,
  },
  {
    key: "google",
    name: "Google",
    file_name: "google.jpeg",
    icon_url: `${STORAGE_PREFIX}google.jpeg`,
    category: "Search / Services",
    domain_patterns: ["google.com", "google.co.in", "gstatic.com", "googleapis.com"],
    is_active: true,
  },
  {
    key: "jio-hotstar",
    name: "JioHotstar",
    file_name: "jio-hotstar.jpeg",
    icon_url: `${STORAGE_PREFIX}jio-hotstar.jpeg`,
    category: "OTT",
    domain_patterns: ["hotstar.com", "jiohotstar.com"],
    is_active: true,
  },
  {
    key: "linkedin",
    name: "LinkedIn",
    file_name: "linkedin.jpeg",
    icon_url: `${STORAGE_PREFIX}linkedin.jpeg`,
    category: "Professional / Social",
    domain_patterns: ["linkedin.com", "licdn.com"],
    is_active: true,
  },
  {
    key: "netflix",
    name: "Netflix",
    file_name: "netflix.jpeg",
    icon_url: `${STORAGE_PREFIX}netflix.jpeg`,
    category: "OTT",
    domain_patterns: ["netflix.com", "nflxvideo.net", "nflxext.com"],
    is_active: true,
  },
  {
    key: "paytm",
    name: "Paytm",
    file_name: "paytm.jpeg",
    icon_url: `${STORAGE_PREFIX}paytm.jpeg`,
    category: "Fintech / Payments",
    domain_patterns: ["paytm.com", "paytmbank.com"],
    is_active: true,
  },
  {
    key: "phonepe",
    name: "PhonePe",
    file_name: "phonepe.jpeg",
    icon_url: `${STORAGE_PREFIX}phonepe.jpeg`,
    category: "Fintech / Payments",
    domain_patterns: ["phonepe.com"],
    is_active: true,
  },
  {
    key: "whatsapp",
    name: "WhatsApp",
    file_name: "whatsapp.jpeg",
    icon_url: `${STORAGE_PREFIX}whatsapp.jpeg`,
    category: "Communication",
    domain_patterns: ["whatsapp.com", "whatsapp.net"],
    is_active: true,
  },
  {
    key: "x",
    name: "X (Twitter)",
    file_name: "x.jpeg",
    icon_url: `${STORAGE_PREFIX}x.jpeg`,
    category: "Social Media",
    domain_patterns: ["x.com", "twitter.com", "twimg.com"],
    is_active: true,
  },
  {
    key: "youtube",
    name: "YouTube",
    file_name: "youtube.jpeg",
    icon_url: `${STORAGE_PREFIX}youtube.jpeg`,
    category: "OTT",
    domain_patterns: ["youtube.com", "googlevideo.com", "ytimg.com", "youtu.be"],
    is_active: true,
  },
]

const ROUTER_EVENT_TYPES_DATA = [
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
    category: "NETWORK",
    is_active: true
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
    category: "NETWORK",
    is_active: true
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
        source_ip: "192.168.8.108",
        signal_strength: "primary"
      },
      device_details: {
        hostname: "DJ",
        mac: "00:E0:4C:4A:2E:20",
        ip: "192.168.8.108"
      },
      traffic_metrics: {
        bitrate_mbps: 0.1398,
        mb_total_binary: 0.5
      }
    },
    sample: {
      domain_activity: {
        platform: "YouTube",
        platform_canonical: "youtube",
        category: "OTT",
        domain: "www.youtube.com",
        source_ip: "192.168.8.108",
        signal_strength: "primary"
      },
      device_details: {
        hostname: "DJ",
        mac: "00:E0:4C:4A:2E:20",
        ip: "192.168.8.108"
      },
      traffic_metrics: {
        bitrate_mbps: 0.1398,
        mb_total_binary: 0.5
      }
    },
    category: "NETWORK",
    is_active: true
  },
  {
    type: 4,
    name: "TV_EVENT",
    description: "ADB-derived Smart TV state telemetry (~every 3s per TV slot)",
    template: "[TV State] {device_details.event} • ip: {device_details.ip} • slot: {sub_device_id}",
    structure: {
      device_details: {
        ip: "192.168.8.175",
        mac: "00:E0:4C:4A:2E:20",
        event: "connected",
        hostname: "TV_01"
      },
      domain_activity: {
        domain: "youtube.com",
        category: "OTT",
        platform: {
          platform: "youtube",
          title: "Some Video Title",
          current_state: "PLAYING"
        },
        source_ip: "192.168.8.175"
      }
    },
    sample: {
      device_details: {
        ip: "192.168.8.175",
        mac: "00:E0:4C:4A:2E:20",
        event: "connected",
        hostname: "TV_01"
      },
      domain_activity: {
        domain: "youtube.com",
        category: "OTT",
        platform: {
          platform: "youtube",
          title: "Some Video Title",
          current_state: "PLAYING"
        },
        source_ip: "192.168.8.175"
      }
    },
    category: "NETWORK",
    is_active: true
  },
  {
    type: 5,
    name: "SESSION_END",
    description: "Platform streaming session ended summary",
    template: "[{session.platform}] duration: {session.duration_sec}s • end: {session.end_reason}",
    structure: {
      session: {
        session_id: "16ef6410-411f-4f54-8689-304de901640b",
        platform: "youtube",
        platform_canonical: "youtube",
        category: "OTT",
        service_category: "UGC / AVOD",
        duration_sec: 138,
        end_reason: "timeout",
        bytes_total: 52428800,
        bytes_down: 50000000,
        bytes_up: 2428800,
        device_ip: "192.168.6.130",
        device_mac: "C2:2F:45:91:1F:5A",
        domain_hit_count: 2,
        session_start_ts: 1793773762,
        session_end_ts: 1793773900
      }
    },
    sample: {
      session: {
        session_id: "16ef6410-411f-4f54-8689-304de901640b",
        platform: "youtube",
        platform_canonical: "youtube",
        category: "OTT",
        service_category: "UGC / AVOD",
        duration_sec: 138,
        end_reason: "timeout",
        bytes_total: 52428800,
        bytes_down: 50000000,
        bytes_up: 2428800,
        device_ip: "192.168.6.130",
        device_mac: "C2:2F:45:91:1F:5A",
        domain_hit_count: 2,
        session_start_ts: 1793773762,
        session_end_ts: 1793773900
      }
    },
    category: "NETWORK",
    is_active: true
  },
  {
    type: 6,
    name: "MEMBER_REGISTRATION",
    description: "Member to device mapping registration",
    template: "Registered member devices: {member_details.length} • Members: {member_summary}",
    structure: {
      member_details: [
        {
          ip: "192.168.8.138",
          mac: "B0:A1:87:32:91:FF",
          device_type: "Mobile",
          member_code: "M01",
          age: 32,
          gender: "M"
        }
      ]
    },
    sample: {
      member_details: [
        {
          ip: "192.168.8.138",
          mac: "B0:A1:87:32:91:FF",
          device_type: "Mobile",
          member_code: "M01",
          age: 32,
          gender: "M"
        }
      ]
    },
    category: "NETWORK",
    is_active: true
  },
  {
    type: 7,
    name: "CONSUMER_JOINED",
    description: "Active consumer joined bandwidth consumption",
    template: "[Consumer Joined] IP: {ip} ({hostname})",
    structure: {
      ip: "192.168.8.108",
      hostname: "Living Room TV",
      bytes_delta_30s: 1048576
    },
    sample: {
      ip: "192.168.8.108",
      hostname: "Living Room TV",
      bytes_delta_30s: 1048576
    },
    category: "NETWORK",
    is_active: true
  },
  {
    type: 8,
    name: "CONSUMER_HEARTBEAT",
    description: "Periodic telemetry report on consumer traffic",
    template: "[Heartbeat] {active_count} active consumers",
    structure: {
      active_count: 2,
      consumers: [
        { hostname: "Smart TV", bytes_delta_30s: 2097152 }
      ]
    },
    sample: {
      active_count: 2,
      consumers: [
        { hostname: "Smart TV", bytes_delta_30s: 2097152 }
      ]
    },
    category: "NETWORK",
    is_active: true
  },
  {
    type: 9,
    name: "CONSUMER_LEFT",
    description: "Consumer stopped traffic and session closed",
    template: "[Consumer Left] IP: {ip} • total: {total_bytes_session} bytes ({duration_sec}s)",
    structure: {
      ip: "192.168.8.108",
      total_bytes_session: 52428800,
      duration_sec: 1800
    },
    sample: {
      ip: "192.168.8.108",
      total_bytes_session: 52428800,
      duration_sec: 1800
    },
    category: "NETWORK",
    is_active: true
  },
  {
    type: 10,
    name: "YOUTUBE_CONTENT",
    description: "YouTube specific video title and playhead event",
    template: "[YouTube] {content.title} • IP: {device_context.source_ip}",
    structure: {
      content: {
        title: "Discovery Channel Documentary",
        video_id: "abc123xyz"
      },
      device_context: {
        source_ip: "192.168.8.108"
      }
    },
    sample: {
      content: {
        title: "Discovery Channel Documentary",
        video_id: "abc123xyz"
      },
      device_context: {
        source_ip: "192.168.8.108"
      }
    },
    category: "NETWORK",
    is_active: true
  },
  {
    type: 11,
    name: "YOUTUBE_AD",
    description: "YouTube advertisement detected and monitored",
    template: "[YouTube Ad] {content.ad_domain} • IP: {device_context.source_ip}",
    structure: {
      content: {
        ad_domain: "doubleclick.net"
      },
      device_context: {
        source_ip: "192.168.8.108"
      }
    },
    sample: {
      content: {
        ad_domain: "doubleclick.net"
      },
      device_context: {
        source_ip: "192.168.8.108"
      }
    },
    category: "NETWORK",
    is_active: true
  }
]

const ALL_ROUTER_RULES = [
  // Type 1: DEVICE_CONNECT
  { type_id: 1, field: "device_details.iface", operator: "equals", value: "ra0", display_text: "2.4GHz Wi-Fi", badge_color: "info" },
  { type_id: 1, field: "device_details.iface", operator: "equals", value: "rax0", display_text: "5GHz Wi-Fi", badge_color: "success" },
  { type_id: 1, field: "device_details.iface", operator: "equals", value: "lan", display_text: "Wired LAN", badge_color: "default" },

  // Type 2: DEVICE_DISCONNECT
  { type_id: 2, field: "device_details.event", operator: "equals", value: "disconnected", display_text: "Disconnected", badge_color: "warning" },

  // Type 3: DOMAIN_ACTIVITY
  { type_id: 3, field: "domain_activity.signal_strength", operator: "equals", value: "primary", display_text: "Primary Lock", badge_color: "success" },
  { type_id: 3, field: "domain_activity.signal_strength", operator: "equals", value: "secondary", display_text: "Secondary", badge_color: "info" },
  { type_id: 3, field: "domain_activity.category", operator: "equals", value: "OTT", display_text: "OTT Stream", badge_color: "success" },

  // Type 4: TV_EVENT
  { type_id: 4, field: "domain_activity.platform.current_state", operator: "equals", value: "ACTIVE", display_text: "Playing", badge_color: "success" },
  { type_id: 4, field: "domain_activity.platform.current_state", operator: "equals", value: "PLAYING", display_text: "Media Playing", badge_color: "success" },
  { type_id: 4, field: "device_details.event", operator: "equals", value: "off", display_text: "TV Off", badge_color: "destructive" },

  // Type 5: SESSION_END
  { type_id: 5, field: "session.category", operator: "equals", value: "OTT", display_text: "OTT Session", badge_color: "info" },
  { type_id: 5, field: "session.end_reason", operator: "equals", value: "timeout", display_text: "Timeout", badge_color: "warning" },
  { type_id: 5, field: "session.end_reason", operator: "equals", value: "disconnect", display_text: "Disconnect", badge_color: "destructive" },
  { type_id: 5, field: "session.end_reason", operator: "equals", value: "normal", display_text: "Completed", badge_color: "success" },
  { type_id: 5, field: "session.platform", operator: "equals", value: "youtube", display_text: "YouTube", badge_color: "destructive" },
  { type_id: 5, field: "device_details.event", operator: "equals", value: "session_end", display_text: "Session Ended", badge_color: "info" },
]

async function seed() {
  console.log("Seeding Supabase DB...")

  // 1. Seed all 15 platforms into platform_mappings
  console.log("\n1. Upserting all 15 platforms into platform_mappings table...")
  for (const plat of ALL_15_PLATFORMS) {
    const { error } = await supabase
      .from("platform_mappings")
      .upsert(plat, { onConflict: "key" })
    if (error) {
      console.error(`Error inserting platform ${plat.key}:`, error.message)
    } else {
      console.log(`  ✓ ${plat.key} (${plat.name}) -> ${plat.file_name}`)
    }
  }

  // 2. Upsert all 11 router event types
  console.log("\n2. Upserting all 11 router event types into router_event_types table...")
  for (const t of ROUTER_EVENT_TYPES_DATA) {
    const { error } = await supabase
      .from("router_event_types")
      .upsert(t, { onConflict: "type" })
    if (error) {
      console.error(`Error inserting event type ${t.type}:`, error.message)
    } else {
      console.log(`  ✓ Type ${t.type} (${t.name}) -> Template: ${t.template}`)
    }
  }

  // 3. Clear and seed all router field rules
  console.log("\n3. Re-seeding router_field_rules table...")
  const { error: delError } = await supabase
    .from("router_field_rules")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000") // delete all rows
  if (delError) console.warn("Delete rules warning:", delError.message)

  const { error: insertRulesError } = await supabase
    .from("router_field_rules")
    .insert(ALL_ROUTER_RULES.map((r, idx) => ({ ...r, priority: idx, enabled: true })))

  if (insertRulesError) {
    console.error("Error inserting rules:", insertRulesError.message)
  } else {
    console.log(`  ✓ Inserted ${ALL_ROUTER_RULES.length} rules across event types.`)
  }

  console.log("\nSeeding finished successfully!")
}

seed().catch(err => {
  console.error("Fatal error:", err)
  process.exit(1)
})

