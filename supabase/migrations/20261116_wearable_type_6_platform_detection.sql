-- ==============================================================================
-- Migration: 20261116_wearable_type_6_platform_detection.sql
-- Description: Add Wearable Event Type 6 (PLATFORM_DETECTION)
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
  'Streaming platform, OTT service, or broadcast app detected on the wearable device.',
  '[{platform}] {content} • Platform Detected',
  '{
    "platform": "string (e.g. YouTube, Netflix, Hotstar, Spotify)",
    "content": "string (e.g. Channel 1, Live Stream)",
    "status": "string (detected | active)",
    "details": {
      "domain": "string",
      "category": "string (OTT | Social | Music)",
      "confidence": "float",
      "duration_sec": "int"
    }
  }'::jsonb,
  '{
    "platform": "YouTube",
    "content": "Live Stream",
    "status": "detected",
    "details": {
      "domain": "youtube.com",
      "category": "OTT",
      "confidence": 0.95,
      "duration_sec": 120
    }
  }'::jsonb,
  '[
    {"id":"rule-wearable-platform-detected","field":"status","operator":"equals","value":"detected","display_text":"Platform Detected","badge_color":"success","enabled":true},
    {"id":"rule-wearable-platform-active","field":"platform","operator":"not_equals","value":"","display_text":"OTT Active","badge_color":"info","enabled":true},
    {"id":"rule-wearable-platform-category","field":"details.category","operator":"equals","value":"OTT","display_text":"Streaming OTT","badge_color":"default","enabled":true}
  ]'::jsonb
)
ON CONFLICT (type) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  template = COALESCE(wearable_event_types.template, EXCLUDED.template),
  structure = COALESCE(wearable_event_types.structure, EXCLUDED.structure),
  sample = COALESCE(wearable_event_types.sample, EXCLUDED.sample),
  field_rules = COALESCE(wearable_event_types.field_rules, EXCLUDED.field_rules),
  updated_at = now();
