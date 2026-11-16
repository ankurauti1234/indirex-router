-- Migration: Remove Wearable Type 2 (WATERMARK_LISTENING)
-- Type 2 is a high-frequency (15s) carrier heartbeat that is excluded from telemetry event logs and mapping.

DELETE FROM public.wearable_event_types WHERE type = 2;
