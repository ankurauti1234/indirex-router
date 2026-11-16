export interface WearableFieldRule {
  id: string
  field: string
  operator: "equals" | "contains" | "not_equals" | "is_empty" | "gt" | "lt"
  value: string
  display_text: string
  badge_color?: "default" | "warning" | "destructive" | "success" | "info"
  enabled: boolean
}

export interface WearableEventTypeMeta {
  type: number
  name: string
  description: string
  template: string
  structure: any
  sample: any
  field_rules: WearableFieldRule[]
}

export const DEFAULT_WEARABLE_EVENT_TYPES: WearableEventTypeMeta[] = [
  {
    type: 1,
    name: "SONG_MATCHED",
    description: "Acoustic watermark matched across media channels (News, Radio, Sports, Songs, etc.). Sent periodically while match active.",
    template: "[{content_type}] {content} • Watermark Verified",
    structure: {
      status: "string ('matched')",
      content_type: "string ('News' | 'Radio' | 'Sports and Entertainment' | 'Songs')",
      content: "string (e.g. 'Channel 1', 'Channel 2')",
      details: {
        confidence: "float",
        watermark_id: "string",
        mic_level_db: "int",
        match_duration_sec: "int",
      },
    },
    sample: {
      status: "matched",
      content_type: "News",
      content: "Channel 2",
      details: {
        confidence: 0.98,
        watermark_id: "WM_0842",
        mic_level_db: -38,
        match_duration_sec: 10,
      },
    },
    field_rules: [
      {
        id: "rule-wearable-status-matched",
        field: "status",
        operator: "equals",
        value: "matched",
        display_text: "Matched",
        badge_color: "success",
        enabled: true,
      },
      {
        id: "rule-wearable-song-detected",
        field: "content",
        operator: "not_equals",
        value: "",
        display_text: "Acoustic Verified",
        badge_color: "info",
        enabled: true,
      },
    ],
  },
  {
    type: 3,
    name: "WIFI_STATUS",
    description: "WiFi on/off/connect/disconnect event + 180s periodic heartbeat.",
    template: "[WiFi {wifi_status}] {ssid} • {wifi_connected}",
    structure: {
      wifi_status: "string ('ON' | 'OFF')",
      wifi_connected: "boolean",
      ssid: "string (only when connected)",
      details: {
        wifi: "string",
        state: "string",
        status: "string",
        connected: "boolean",
        rssi: "int",
      },
    },
    sample: {
      wifi_status: "ON",
      wifi_connected: false,
      ssid: "Home_WiFi_5G",
      details: {
        wifi: "ON",
        state: "ENABLED",
        status: "ON",
        connected: false,
      },
    },
    field_rules: [
      {
        id: "rule-wearable-wifi-connected",
        field: "wifi_connected",
        operator: "equals",
        value: "true",
        display_text: "WiFi Online",
        badge_color: "success",
        enabled: true,
      },
      {
        id: "rule-wearable-wifi-disconnected",
        field: "wifi_connected",
        operator: "equals",
        value: "false",
        display_text: "WiFi Offline",
        badge_color: "warning",
        enabled: true,
      },
      {
        id: "rule-wearable-wifi-on",
        field: "wifi_status",
        operator: "equals",
        value: "ON",
        display_text: "WiFi ON",
        badge_color: "info",
        enabled: true,
      },
      {
        id: "rule-wearable-wifi-off",
        field: "wifi_status",
        operator: "equals",
        value: "OFF",
        display_text: "WiFi OFF",
        badge_color: "destructive",
        enabled: true,
      },
    ],
  },
  {
    type: 4,
    name: "DEVICE_CALIBRATION",
    description: "Wearable device installation, member assignment, and diagnostic calibration summary.",
    template: "[Registration {status}] HH: {hh_id} • Member: {member_id} • Serial: {serial_no} • Battery: {calibration_summary.diagnostics.battery_health.percentage} • Mic: {calibration_summary.diagnostics.mic}",
    structure: {
      status: "string ('installed' | 'calibrated' | 'pending')",
      meter_id: "string",
      serial_no: "string",
      hh_id: "string",
      member_id: "string",
      otp: "string",
      calibration_summary: {
        registration: "string",
        audio_calibration: "string",
        watermark_test: "string",
        connectivity_sync: "string",
        battery_docking: "string",
        diagnostics: {
          wifi_status: "string",
          mic: "string",
          watermark_id: "string",
          watermark_sdk_ver: "string",
          indi_aosp_ver: "string",
          battery_health: {
            charging: "string",
            discharging: "string",
            percentage: "string",
          },
        },
      },
    },
    sample: {
      meter_id: "WM000A",
      serial_no: "AWT5-2026-001",
      hh_id: "HH1001",
      member_id: "M01",
      otp: "123456",
      status: "installed",
      calibration_summary: {
        registration: "validated",
        diagnostics: {
          wifi_status: "ON",
          battery_health: {
            charging: "Pass",
            discharging: "Pass",
            percentage: "85%",
          },
          mic: "Pass",
          watermark_id: "ABCDEF",
          watermark_sdk_ver: "2.1.0",
          indi_aosp_ver: "1.5.0",
        },
        audio_calibration: "pass",
        watermark_test: "pass",
        connectivity_sync: "connected",
        battery_docking: "ok",
      },
    },
    field_rules: [
      {
        id: "rule-wearable-status-installed",
        field: "status",
        operator: "equals",
        value: "installed",
        display_text: "Installed",
        badge_color: "success",
        enabled: true,
      },
      {
        id: "rule-wearable-reg-validated",
        field: "calibration_summary.registration",
        operator: "equals",
        value: "validated",
        display_text: "Registration Validated",
        badge_color: "success",
        enabled: true,
      },
      {
        id: "rule-wearable-mic-pass",
        field: "calibration_summary.diagnostics.mic",
        operator: "equals",
        value: "Pass",
        display_text: "Mic Pass",
        badge_color: "info",
        enabled: true,
      },
      {
        id: "rule-wearable-audio-pass",
        field: "calibration_summary.audio_calibration",
        operator: "equals",
        value: "pass",
        display_text: "Audio Calibrated",
        badge_color: "success",
        enabled: true,
      },
      {
        id: "rule-wearable-docking-ok",
        field: "calibration_summary.battery_docking",
        operator: "equals",
        value: "ok",
        display_text: "Docked OK",
        badge_color: "info",
        enabled: true,
      },
    ],
  },
  {
    type: 6,
    name: "PLATFORM_DETECTION",
    description: "Streaming platform, OTT service, or broadcast app detected on the wearable device.",
    template: "[{platform}] {content} • Platform Detected",
    structure: {
      platform: "string (e.g. 'YouTube', 'Netflix', 'Hotstar', 'Spotify')",
      content: "string (e.g. 'Channel 1', 'Live Stream')",
      status: "string ('detected' | 'active')",
      details: {
        domain: "string",
        category: "string ('OTT' | 'Social' | 'Music')",
        confidence: "float",
        duration_sec: "int",
      },
    },
    sample: {
      platform: "YouTube",
      content: "Live Stream",
      status: "detected",
      details: {
        domain: "youtube.com",
        category: "OTT",
        confidence: 0.95,
        duration_sec: 120,
      },
    },
    field_rules: [
      {
        id: "rule-wearable-platform-detected",
        field: "status",
        operator: "equals",
        value: "detected",
        display_text: "Platform Detected",
        badge_color: "success",
        enabled: true,
      },
      {
        id: "rule-wearable-platform-active",
        field: "platform",
        operator: "not_equals",
        value: "",
        display_text: "OTT Active",
        badge_color: "info",
        enabled: true,
      },
      {
        id: "rule-wearable-platform-category",
        field: "details.category",
        operator: "equals",
        value: "OTT",
        display_text: "Streaming OTT",
        badge_color: "default",
        enabled: true,
      },
    ],
  },
]

