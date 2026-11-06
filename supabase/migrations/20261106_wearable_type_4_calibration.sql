-- ==============================================================================
-- Migration: 20261106_wearable_type_4_calibration.sql
-- Description: Add Wearable Event Type 4 (DEVICE_CALIBRATION)
-- ==============================================================================

INSERT INTO public.wearable_event_types (type, name, description) VALUES
  (4, 'DEVICE_CALIBRATION', 'Wearable device installation, member assignment, and diagnostic calibration summary.')
ON CONFLICT (type) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description;
