-- Add status and estimated delivery date columns to vehicles table
ALTER TABLE public.vehicles 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'yok',
ADD COLUMN IF NOT EXISTS estimated_delivery_date date;

-- Add a comment describing status values
COMMENT ON COLUMN public.vehicles.status IS 'Vehicle status: islemde, sirada, tamamlandi, yok';