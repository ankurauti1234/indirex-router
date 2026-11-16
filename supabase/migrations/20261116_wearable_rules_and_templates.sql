-- ==============================================================================
-- Migration: 20261116_wearable_rules_and_templates.sql
-- Description: Upgrade Wearable Telemetry schema to support DB-synced templates & field rules
-- ==============================================================================

-- 1. Upgrade wearable_event_types table with template, schema, and field_rules columns
ALTER TABLE public.wearable_event_types
    ADD COLUMN IF NOT EXISTS template TEXT,
    ADD COLUMN IF NOT EXISTS structure JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS sample JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS field_rules JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 2. Create wearable_field_rules table for persistent, team-wide condition rules
CREATE TABLE IF NOT EXISTS public.wearable_field_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type_id SMALLINT NOT NULL REFERENCES public.wearable_event_types(type) ON DELETE CASCADE,
    field TEXT NOT NULL,
    operator TEXT NOT NULL DEFAULT 'equals',
    value TEXT NOT NULL,
    display_text TEXT NOT NULL,
    badge_color TEXT DEFAULT 'default',
    priority INTEGER DEFAULT 0,
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wearable_field_rules_type ON public.wearable_field_rules(type_id);
CREATE INDEX IF NOT EXISTS idx_wearable_field_rules_enabled ON public.wearable_field_rules(enabled);

-- Enable RLS and public policies
ALTER TABLE public.wearable_field_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read on wearable_field_rules" ON public.wearable_field_rules FOR SELECT USING (true);
CREATE POLICY "Allow service role write on wearable_field_rules" ON public.wearable_field_rules FOR ALL USING (true);

-- 3. Populate default templates and field rules for active wearable event types (1, 3, 4)
UPDATE public.wearable_event_types
SET template = '[{content_type}] {content} • Watermark Verified',
    field_rules = '[
      {"id":"rule-wearable-status-matched","field":"status","operator":"equals","value":"matched","display_text":"Matched","badge_color":"success","enabled":true},
      {"id":"rule-wearable-song-detected","field":"content","operator":"not_equals","value":"","display_text":"Acoustic Verified","badge_color":"info","enabled":true}
    ]'::jsonb,
    updated_at = now()
WHERE type = 1;

UPDATE public.wearable_event_types
SET template = '[WiFi {wifi_status}] {ssid} • {wifi_connected}',
    field_rules = '[
      {"id":"rule-wearable-wifi-connected","field":"wifi_connected","operator":"equals","value":"true","display_text":"Online","badge_color":"success","enabled":true},
      {"id":"rule-wearable-wifi-disconnected","field":"wifi_connected","operator":"equals","value":"false","display_text":"Offline","badge_color":"destructive","enabled":true},
      {"id":"rule-wearable-wifi-on","field":"wifi_status","operator":"equals","value":"ON","display_text":"WiFi Active","badge_color":"info","enabled":true}
    ]'::jsonb,
    updated_at = now()
WHERE type = 3;

UPDATE public.wearable_event_types
SET template = '[Registration {details.status}] HH: {details.hh_id} • Member: {details.member_id} • Serial: {details.serial_no} • Battery: {details.calibration_summary.diagnostics.battery_health.percentage}',
    field_rules = '[
      {"id":"rule-wearable-installed","field":"details.status","operator":"equals","value":"installed","display_text":"Installed","badge_color":"success","enabled":true},
      {"id":"rule-wearable-reg-validated","field":"details.calibration_summary.registration","operator":"equals","value":"validated","display_text":"Validated","badge_color":"success","enabled":true},
      {"id":"rule-wearable-sync-connected","field":"details.calibration_summary.connectivity_sync","operator":"equals","value":"connected","display_text":"Sync OK","badge_color":"info","enabled":true},
      {"id":"rule-wearable-audio-pass","field":"details.calibration_summary.audio_calibration","operator":"equals","value":"pass","display_text":"Audio Pass","badge_color":"success","enabled":true},
      {"id":"rule-wearable-docking-ok","field":"details.calibration_summary.battery_docking","operator":"equals","value":"ok","display_text":"Docked OK","badge_color":"default","enabled":true}
    ]'::jsonb,
    updated_at = now()
WHERE type = 4;
