-- ==============================================================================
-- Migration: 20261116_wearable_type_6_platform_detection.sql
-- Description: Add Wearable Event Type 6 (PLATFORM_DETECTION) with Smart TV & OTT App fields
-- ==============================================================================

-- 1. Ensure table structure supports metadata columns
ALTER TABLE public.wearable_event_types
    ADD COLUMN IF NOT EXISTS template TEXT,
    ADD COLUMN IF NOT EXISTS structure JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS sample JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS field_rules JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 2. Insert or update wearable event type 6 (PLATFORM_DETECTION)
INSERT INTO public.wearable_event_types (type, name, description, template, structure, sample, field_rules)
VALUES (
  6,
  'PLATFORM_DETECTION',
  'Smart TV / OTT platform & active app detection (Google Cast, Android TV, Netflix, YouTube, etc.).',
  '[{active_app}] {tv_brand} ({tv_model}) • {tv_platform} • IP: {tv_ip} • {source}',
  '{
    "tv_ip": "string",
    "source": "string (e.g. CAST_8009)",
    "meter_id": "string",
    "tv_brand": "string",
    "tv_model": "string",
    "active_app": "string (e.g. Netflix, YouTube)",
    "tv_platform": "string (e.g. Google Cast / Android TV)",
    "content_type": "string",
    "content": "string",
    "status": "string",
    "wifi_status": "string",
    "wifi_connected": "boolean | null",
    "ssid": "string"
  }'::jsonb,
  '{
    "tv_ip": "192.168.0.140",
    "source": "CAST_8009",
    "meter_id": "WMC074",
    "tv_brand": "Android TV",
    "tv_model": "Smart TV",
    "active_app": "Netflix",
    "tv_platform": "Google Cast / Android TV",
    "content_type": "",
    "content": "",
    "status": "",
    "wifi_status": "",
    "wifi_connected": null,
    "ssid": ""
  }'::jsonb,
  '[
    {"id":"rule-wearable-app-detected","field":"active_app","operator":"not_equals","value":"","display_text":"App Active","badge_color":"success","enabled":true},
    {"id":"rule-wearable-cast-source","field":"source","operator":"contains","value":"CAST","display_text":"Google Cast","badge_color":"info","enabled":true},
    {"id":"rule-wearable-smart-tv","field":"tv_platform","operator":"contains","value":"Android","display_text":"Android TV","badge_color":"default","enabled":true}
  ]'::jsonb
)
ON CONFLICT (type) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  template = EXCLUDED.template,
  structure = EXCLUDED.structure,
  sample = EXCLUDED.sample,
  field_rules = EXCLUDED.field_rules,
  updated_at = now();
