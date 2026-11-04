-- ==============================================================================
-- Schema Improvements for Router & Audience Telemetry System
-- Migration: 20261104_schema_improvements.sql
-- ==============================================================================

-- 1. PLATFORM MAPPINGS TABLE
-- Replaces storage-bucket mappings.json and client localStorage caching.
CREATE TABLE IF NOT EXISTS public.platform_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    icon_url TEXT NOT NULL,
    file_name TEXT,
    category TEXT DEFAULT 'OTT',
    domain_patterns TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for lookup by key
CREATE INDEX IF NOT EXISTS idx_platform_mappings_key ON public.platform_mappings(key);

-- Seed all 15 platforms
INSERT INTO public.platform_mappings (key, name, icon_url, file_name, category, domain_patterns)
VALUES
('amazon-prime', 'Amazon Prime Video', 'https://rrckvqnaajywiyfberob.supabase.co/storage/v1/object/public/router-device-assets/ott-icons/amazon-prime.jpeg', 'amazon-prime.jpeg', 'OTT', ARRAY['primevideo.com', 'amazonvideo.com', 'pv-cdn.net']),
('amazon', 'Amazon', 'https://rrckvqnaajywiyfberob.supabase.co/storage/v1/object/public/router-device-assets/ott-icons/amazon.jpeg', 'amazon.jpeg', 'E-Commerce', ARRAY['amazon.in', 'amazon.com', 'ssl-images-amazon.com', 'media-amazon.com']),
('blinkit', 'Blinkit', 'https://rrckvqnaajywiyfberob.supabase.co/storage/v1/object/public/router-device-assets/ott-icons/blinkit.jpeg', 'blinkit.jpeg', 'Quick Commerce', ARRAY['blinkit.com', 'grofers.com']),
('chatgpt', 'ChatGPT', 'https://rrckvqnaajywiyfberob.supabase.co/storage/v1/object/public/router-device-assets/ott-icons/chatgpt.jpeg', 'chatgpt.jpeg', 'AI / Productivity', ARRAY['chatgpt.com', 'openai.com', 'oaistatic.com', 'oaiusercontent.com']),
('facebook', 'Facebook', 'https://rrckvqnaajywiyfberob.supabase.co/storage/v1/object/public/router-device-assets/ott-icons/facebook.jpeg', 'facebook.jpeg', 'Social Media', ARRAY['facebook.com', 'fbcdn.net', 'meta.com']),
('flipkart', 'Flipkart', 'https://rrckvqnaajywiyfberob.supabase.co/storage/v1/object/public/router-device-assets/ott-icons/flipkart.jpeg', 'flipkart.jpeg', 'E-Commerce', ARRAY['flipkart.com', 'flixcart.com']),
('google', 'Google', 'https://rrckvqnaajywiyfberob.supabase.co/storage/v1/object/public/router-device-assets/ott-icons/google.jpeg', 'google.jpeg', 'Search / Services', ARRAY['google.com', 'google.co.in', 'gstatic.com', 'googleapis.com']),
('jio-hotstar', 'JioHotstar', 'https://rrckvqnaajywiyfberob.supabase.co/storage/v1/object/public/router-device-assets/ott-icons/jio-hotstar.jpeg', 'jio-hotstar.jpeg', 'OTT', ARRAY['hotstar.com', 'jiohotstar.com']),
('linkedin', 'LinkedIn', 'https://rrckvqnaajywiyfberob.supabase.co/storage/v1/object/public/router-device-assets/ott-icons/linkedin.jpeg', 'linkedin.jpeg', 'Professional / Social', ARRAY['linkedin.com', 'licdn.com']),
('netflix', 'Netflix', 'https://rrckvqnaajywiyfberob.supabase.co/storage/v1/object/public/router-device-assets/ott-icons/netflix.jpeg', 'netflix.jpeg', 'OTT', ARRAY['netflix.com', 'nflxvideo.net', 'nflxext.com']),
('paytm', 'Paytm', 'https://rrckvqnaajywiyfberob.supabase.co/storage/v1/object/public/router-device-assets/ott-icons/paytm.jpeg', 'paytm.jpeg', 'Fintech / Payments', ARRAY['paytm.com', 'paytmbank.com']),
('phonepe', 'PhonePe', 'https://rrckvqnaajywiyfberob.supabase.co/storage/v1/object/public/router-device-assets/ott-icons/phonepe.jpeg', 'phonepe.jpeg', 'Fintech / Payments', ARRAY['phonepe.com']),
('whatsapp', 'WhatsApp', 'https://rrckvqnaajywiyfberob.supabase.co/storage/v1/object/public/router-device-assets/ott-icons/whatsapp.jpeg', 'whatsapp.jpeg', 'Communication', ARRAY['whatsapp.com', 'whatsapp.net']),
('x', 'X (Twitter)', 'https://rrckvqnaajywiyfberob.supabase.co/storage/v1/object/public/router-device-assets/ott-icons/x.jpeg', 'x.jpeg', 'Social Media', ARRAY['x.com', 'twitter.com', 'twimg.com']),
('youtube', 'YouTube', 'https://rrckvqnaajywiyfberob.supabase.co/storage/v1/object/public/router-device-assets/ott-icons/youtube.jpeg', 'youtube.jpeg', 'OTT', ARRAY['youtube.com', 'googlevideo.com', 'ytimg.com', 'youtu.be'])
ON CONFLICT (key) DO UPDATE SET
    name = EXCLUDED.name,
    icon_url = EXCLUDED.icon_url,
    file_name = EXCLUDED.file_name,
    category = EXCLUDED.category,
    domain_patterns = EXCLUDED.domain_patterns;


-- 2. UPGRADE ROUTER_EVENT_TYPES TABLE
-- Add columns to store dynamic formatting templates, payload schemas, and sample payloads
ALTER TABLE public.router_event_types
    ADD COLUMN IF NOT EXISTS template TEXT,
    ADD COLUMN IF NOT EXISTS structure JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS sample JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'NETWORK',
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();


-- 3. ROUTER_FIELD_RULES TABLE
-- Replaces browser localStorage rules trap and allows persistent, team-wide field rules
CREATE TABLE IF NOT EXISTS public.router_field_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type_id INTEGER NOT NULL REFERENCES public.router_event_types(type) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS idx_router_field_rules_type ON public.router_field_rules(type_id);
CREATE INDEX IF NOT EXISTS idx_router_field_rules_enabled ON public.router_field_rules(enabled);


-- 4. PERFORMANCE ENHANCEMENTS & INDEXES
CREATE INDEX IF NOT EXISTS idx_router_events_timestamp ON public.router_events (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_router_events_device_type ON public.router_events (device_id, type);
CREATE INDEX IF NOT EXISTS idx_router_events_sub_device ON public.router_events (sub_device_id);

-- Distinct Devices Fast View
CREATE OR REPLACE VIEW public.v_distinct_router_devices AS
SELECT DISTINCT device_id FROM public.router_events WHERE device_id IS NOT NULL;


-- 5. SEED DEFAULT ROUTER EVENT TYPES & RULES
-- Populate event types 1 to 11 with default templates and structures
INSERT INTO public.router_event_types (type, name, description, template, structure, sample)
VALUES
(1, 'DEVICE_CONNECT', 'Client joined Wi-Fi or LAN network', 
 '[{device_details.iface}] connected: {device_details.hostname} ({device_details.ip}) • MAC: {device_details.mac}',
 '{"device_details": {"event": "connected", "mac": "00:E0:4C:4A:2E:20", "ip": "192.168.8.108", "iface": "ra0", "hostname": "DJ"}}'::jsonb,
 '{"device_details": {"event": "connected", "mac": "00:E0:4C:4A:2E:20", "ip": "192.168.8.108", "iface": "ra0", "hostname": "DJ"}}'::jsonb),

(2, 'DEVICE_DISCONNECT', 'Client inactive for >15s after previous connection',
 'disconnected: {device_details.hostname} ({device_details.mac}) • duration: {device_details.connected_duration_sec}s',
 '{"device_details": {"event": "disconnected", "mac": "00:E0:4C:4A:2E:20", "ip": "192.168.8.108", "connected_duration_sec": 3600, "hostname": "DJ"}}'::jsonb,
 '{"device_details": {"event": "disconnected", "mac": "00:E0:4C:4A:2E:20", "ip": "192.168.8.108", "connected_duration_sec": 3600, "hostname": "DJ"}}'::jsonb),

(3, 'DOMAIN_ACTIVITY', 'DNS query to whitelisted platform domain with traffic metrics',
 '[{domain_activity.platform}] {domain_activity.domain} • ip: {domain_activity.source_ip} • bitrate: {traffic_metrics.bitrate_mbps} Mbps',
 '{"domain_activity": {"platform": "YouTube", "platform_canonical": "youtube", "category": "OTT", "domain": "www.youtube.com", "source_ip": "192.168.8.108", "signal_strength": "primary"}, "device_details": {"hostname": "DJ", "mac": "00:E0:4C:4A:2E:20", "ip": "192.168.8.108"}, "traffic_metrics": {"bitrate_mbps": 0.1398, "mb_total_binary": 0.5}}'::jsonb,
 '{"domain_activity": {"platform": "YouTube", "platform_canonical": "youtube", "category": "OTT", "domain": "www.youtube.com", "source_ip": "192.168.8.108", "signal_strength": "primary"}, "device_details": {"hostname": "DJ", "mac": "00:E0:4C:4A:2E:20", "ip": "192.168.8.108"}, "traffic_metrics": {"bitrate_mbps": 0.1398, "mb_total_binary": 0.5}}'::jsonb),

(4, 'ACTIVE_TV', 'TV is streaming video traffic or ping telemetry',
 '[{domain_activity.platform.platform}] {domain_activity.platform.title} • {device_details.hostname} ({device_details.ip})',
 '{"device_details": {"event": "active", "hostname": "Smart TV", "ip": "192.168.8.108"}, "domain_activity": {"platform": {"platform": "Netflix", "title": "Stranger Things", "current_state": "ACTIVE"}}}'::jsonb,
 '{"device_details": {"event": "active", "hostname": "Smart TV", "ip": "192.168.8.108"}, "domain_activity": {"platform": {"platform": "Netflix", "title": "Stranger Things", "current_state": "ACTIVE"}}}'::jsonb),

(5, 'SESSION_END', 'Platform streaming session ended summary',
 '[{session.platform}] duration: {session.duration_sec}s • end: {session.end_reason}',
 '{"session": {"category": "OTT", "duration_sec": 138, "end_reason": "timeout", "platform": "youtube", "bytes_total": 52428800}}'::jsonb,
 '{"session": {"category": "OTT", "duration_sec": 138, "end_reason": "timeout", "platform": "youtube", "bytes_total": 52428800}}'::jsonb),

(6, 'PANEL_MEMBER_LIST', 'Household registered devices and demographic assignment',
 'Registered member devices: {member_details.length}',
 '{"member_details": [{"member_code": "M01", "hostname": "John Phone", "device_type": "Mobile"}]}'::jsonb,
 '{"member_details": [{"member_code": "M01", "hostname": "John Phone", "device_type": "Mobile"}]}'::jsonb),

(7, 'CONSUMER_CONNECTED', 'Active consumer joined bandwidth consumption',
 '[Consumer Joined] IP: {ip} ({hostname})',
 '{"ip": "192.168.8.108", "hostname": "Living Room TV", "bytes_delta_30s": 1048576}'::jsonb,
 '{"ip": "192.168.8.108", "hostname": "Living Room TV", "bytes_delta_30s": 1048576}'::jsonb),

(8, 'CONSUMER_HEARTBEAT', 'Periodic telemetry report on consumer traffic',
 '[Heartbeat] {active_count} active consumers',
 '{"active_count": 2, "consumers": [{"hostname": "Smart TV", "bytes_delta_30s": 2097152}]}'::jsonb,
 '{"active_count": 2, "consumers": [{"hostname": "Smart TV", "bytes_delta_30s": 2097152}]}'::jsonb),

(9, 'CONSUMER_DISCONNECTED', 'Consumer stopped traffic and session closed',
 '[Consumer Left] IP: {ip} • total: {total_bytes_session} bytes ({duration_sec}s)',
 '{"ip": "192.168.8.108", "total_bytes_session": 52428800, "duration_sec": 1800}'::jsonb,
 '{"ip": "192.168.8.108", "total_bytes_session": 52428800, "duration_sec": 1800}'::jsonb),

(10, 'YOUTUBE_ACTIVITY', 'YouTube specific video title and playhead event',
 '[YouTube] {content.title} • IP: {device_context.source_ip}',
 '{"content": {"title": "Discovery Channel Documentary", "video_id": "abc123xyz"}, "device_context": {"source_ip": "192.168.8.108"}}'::jsonb,
 '{"content": {"title": "Discovery Channel Documentary", "video_id": "abc123xyz"}, "device_context": {"source_ip": "192.168.8.108"}}'::jsonb),

(11, 'YOUTUBE_AD', 'YouTube advertisement detected and monitored',
 '[YouTube Ad] {content.ad_domain} • IP: {device_context.source_ip}',
 '{"content": {"ad_domain": "doubleclick.net"}, "device_context": {"source_ip": "192.168.8.108"}}'::jsonb,
 '{"content": {"ad_domain": "doubleclick.net"}, "device_context": {"source_ip": "192.168.8.108"}}'::jsonb)
ON CONFLICT (type) DO UPDATE SET
    template = EXCLUDED.template,
    structure = COALESCE(router_event_types.structure, EXCLUDED.structure),
    sample = COALESCE(router_event_types.sample, EXCLUDED.sample);


-- 6. SEED DEFAULT FIELD RULES FOR ROUTER EVENTS
INSERT INTO public.router_field_rules (type_id, field, operator, value, display_text, badge_color)
VALUES
(1, 'device_details.iface', 'equals', 'ra0', '2.4GHz Wi-Fi', 'info'),
(1, 'device_details.iface', 'equals', 'rax0', '5GHz Wi-Fi', 'success'),
(1, 'device_details.iface', 'equals', 'lan', 'Wired LAN', 'default'),
(2, 'device_details.event', 'equals', 'disconnected', 'Disconnected', 'warning'),
(3, 'domain_activity.signal_strength', 'equals', 'primary', 'Primary Lock', 'success'),
(3, 'domain_activity.signal_strength', 'equals', 'secondary', 'Secondary', 'info'),
(3, 'domain_activity.category', 'equals', 'OTT', 'OTT Stream', 'success'),
(4, 'domain_activity.platform.current_state', 'equals', 'ACTIVE', 'Playing', 'success'),
(4, 'domain_activity.platform.current_state', 'equals', 'PLAYING', 'Media Playing', 'success'),
(4, 'device_details.event', 'equals', 'off', 'TV Off', 'destructive'),
(5, 'session.category', 'equals', 'OTT', 'OTT Session', 'info'),
(5, 'session.end_reason', 'equals', 'timeout', 'Timeout', 'warning'),
(5, 'session.end_reason', 'equals', 'disconnect', 'Disconnect', 'destructive'),
(5, 'session.end_reason', 'equals', 'normal', 'Completed', 'success'),
(5, 'session.platform', 'equals', 'youtube', 'YouTube', 'destructive'),
(5, 'device_details.event', 'equals', 'session_end', 'Session Ended', 'info')
ON CONFLICT DO NOTHING;

-- Enable Row Level Security (RLS) but allow authenticated & service role access
ALTER TABLE public.platform_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.router_field_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on platform_mappings" ON public.platform_mappings FOR SELECT USING (true);
CREATE POLICY "Allow service role write on platform_mappings" ON public.platform_mappings FOR ALL USING (true);

CREATE POLICY "Allow public read on router_field_rules" ON public.router_field_rules FOR SELECT USING (true);
CREATE POLICY "Allow service role write on router_field_rules" ON public.router_field_rules FOR ALL USING (true);

-- 7. WEARABLE TELEMETRY SCHEMA
CREATE TABLE IF NOT EXISTS public.wearable_event_types (
  type        smallint PRIMARY KEY,
  name        text NOT NULL UNIQUE,
  description text
);

INSERT INTO public.wearable_event_types (type, name, description) VALUES
  (1, 'SONG_MATCHED',        'Song watermark detected and verified by mic. Sent every 10s while match active.'),
  (2, 'WATERMARK_LISTENING', 'Mic listening / carrier heartbeat. Sent every 15s.'),
  (3, 'WIFI_STATUS',         'WiFi on/off/connect/disconnect event + 180s periodic heartbeat.')
ON CONFLICT (type) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.wearable_devices (
  device_id    text PRIMARY KEY,
  name         text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.wearable_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id   text        NOT NULL,
  type        smallint    NOT NULL REFERENCES public.wearable_event_types(type),
  "timestamp" timestamptz NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  details     jsonb       NOT NULL DEFAULT '{}'::jsonb,
  content_type   text,
  content        text,
  wifi_status    text,
  wifi_connected boolean,
  ssid           text
);

CREATE INDEX IF NOT EXISTS idx_wearable_events_device_ts ON public.wearable_events (device_id, "timestamp" DESC);
CREATE INDEX IF NOT EXISTS idx_wearable_events_type_ts ON public.wearable_events (type, "timestamp" DESC);
CREATE INDEX IF NOT EXISTS idx_wearable_events_song ON public.wearable_events (content, "timestamp" DESC) WHERE type = 1;

ALTER TABLE public.wearable_event_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wearable_devices     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wearable_events      ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read on wearable_event_types" ON public.wearable_event_types FOR SELECT USING (true);
CREATE POLICY "Allow service role on wearable_event_types" ON public.wearable_event_types FOR ALL USING (true);
CREATE POLICY "Allow authenticated read on wearable_devices" ON public.wearable_devices FOR SELECT USING (true);
CREATE POLICY "Allow service role on wearable_devices" ON public.wearable_devices FOR ALL USING (true);
CREATE POLICY "Allow authenticated read on wearable_events" ON public.wearable_events FOR SELECT USING (true);
CREATE POLICY "Allow service role on wearable_events" ON public.wearable_events FOR ALL USING (true);


