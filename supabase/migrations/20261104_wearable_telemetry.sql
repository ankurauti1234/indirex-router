-- ==============================================================================
-- Migration: 20261104_wearable_telemetry.sql
-- Description: Wearable Telemetry Schema, Event Types, Devices, Events & Views
-- ==============================================================================

-- 1. Event Type Lookup
CREATE TABLE IF NOT EXISTS public.wearable_event_types (
  type        smallint PRIMARY KEY,
  name        text NOT NULL UNIQUE,
  description text
);

INSERT INTO public.wearable_event_types (type, name, description) VALUES
  (1, 'SONG_MATCHED',        'Song watermark detected and verified by mic. Sent every 10s while match active.'),
  (2, 'WATERMARK_LISTENING', 'Mic listening / carrier heartbeat. Sent every 15s.'),
  (3, 'WIFI_STATUS',         'WiFi on/off/connect/disconnect event + 180s periodic heartbeat.'),
  (4, 'DEVICE_CALIBRATION',  'Wearable device installation, member assignment, and diagnostic calibration summary.')
ON CONFLICT (type) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description;

-- 2. Registered Wearable Devices
CREATE TABLE IF NOT EXISTS public.wearable_devices (
  device_id    text PRIMARY KEY,
  name         text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz
);

-- 3. Wearable Events
CREATE TABLE IF NOT EXISTS public.wearable_events (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id      text        NOT NULL,
  type           smallint    NOT NULL REFERENCES public.wearable_event_types(type),
  "timestamp"    timestamptz NOT NULL,              -- Device time
  received_at    timestamptz NOT NULL DEFAULT now(),-- Server insert time
  details        jsonb       NOT NULL DEFAULT '{}'::jsonb,  -- Raw payload details

  -- Extracted columns for fast querying & indexing
  content_type   text,                              -- Type 1: "song"
  content        text,                              -- Type 1: song title | Type 2: hex watermark or "listening"
  wifi_status    text,                              -- Type 3: "ON" | "OFF"
  wifi_connected boolean,                           -- Type 3: true / false
  ssid           text                               -- Type 3: Connected network SSID
);

-- Indexes for high-throughput queries & dashboard lookups
CREATE INDEX IF NOT EXISTS idx_wearable_events_device_ts
  ON public.wearable_events (device_id, "timestamp" DESC);

CREATE INDEX IF NOT EXISTS idx_wearable_events_type_ts
  ON public.wearable_events (type, "timestamp" DESC);

CREATE INDEX IF NOT EXISTS idx_wearable_events_song
  ON public.wearable_events (content, "timestamp" DESC) WHERE type = 1;

-- 4. Row Level Security (RLS) & Policies
ALTER TABLE public.wearable_event_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wearable_devices     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wearable_events      ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated read on wearable_event_types') THEN
    CREATE POLICY "Allow authenticated read on wearable_event_types" ON public.wearable_event_types FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow service role on wearable_event_types') THEN
    CREATE POLICY "Allow service role on wearable_event_types" ON public.wearable_event_types FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated read on wearable_devices') THEN
    CREATE POLICY "Allow authenticated read on wearable_devices" ON public.wearable_devices FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow service role on wearable_devices') THEN
    CREATE POLICY "Allow service role on wearable_devices" ON public.wearable_devices FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated read on wearable_events') THEN
    CREATE POLICY "Allow authenticated read on wearable_events" ON public.wearable_events FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow service role on wearable_events') THEN
    CREATE POLICY "Allow service role on wearable_events" ON public.wearable_events FOR ALL USING (true);
  END IF;
END $$;

-- 5. Convenience Analytical Views
CREATE OR REPLACE VIEW public.wearable_song_matches AS
  SELECT id, device_id, "timestamp", content AS song
  FROM public.wearable_events WHERE type = 1;

CREATE OR REPLACE VIEW public.wearable_wifi_latest AS
  SELECT DISTINCT ON (device_id)
         device_id, "timestamp", wifi_status, wifi_connected, ssid
  FROM public.wearable_events WHERE type = 3
  ORDER BY device_id, "timestamp" DESC;

