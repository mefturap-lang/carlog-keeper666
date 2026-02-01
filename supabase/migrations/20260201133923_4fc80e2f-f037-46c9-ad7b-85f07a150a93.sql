-- Add slot_count to admin_settings
ALTER TABLE public.admin_settings 
ADD COLUMN IF NOT EXISTS slot_count integer NOT NULL DEFAULT 30;