-- Add estimated_duration (in minutes) and completed_at to service_records
ALTER TABLE public.service_records 
ADD COLUMN IF NOT EXISTS estimated_duration_minutes integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS completed_at timestamp with time zone DEFAULT NULL;

-- Add assigned_technician to vehicles table
ALTER TABLE public.vehicles 
ADD COLUMN IF NOT EXISTS assigned_technician text DEFAULT NULL;

-- Create index for faster queries on incomplete records
CREATE INDEX IF NOT EXISTS idx_service_records_status_completed 
ON public.service_records (record_status, completed_at) 
WHERE record_status != 'tamamlandi' OR completed_at IS NULL;