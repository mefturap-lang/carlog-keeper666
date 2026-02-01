-- Add cost and technician fields to service_records
ALTER TABLE public.service_records 
ADD COLUMN IF NOT EXISTS part_cost NUMERIC(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS labor_cost NUMERIC(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS unit_price NUMERIC(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS technician TEXT,
ADD COLUMN IF NOT EXISTS stock_code TEXT,
ADD COLUMN IF NOT EXISTS operation_type TEXT, -- degisim/onarim
ADD COLUMN IF NOT EXISTS part_source TEXT, -- cikma/sifir
ADD COLUMN IF NOT EXISTS part_quality TEXT; -- oem/muadil

-- Add body_parts JSON column to vehicles for storing bodywork status
ALTER TABLE public.vehicles
ADD COLUMN IF NOT EXISTS body_parts JSONB DEFAULT '{}'::jsonb;

-- Create table for periodic maintenance items
CREATE TABLE IF NOT EXISTS public.periodic_maintenance_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  service_record_id UUID REFERENCES public.service_records(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL,
  product_used TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on periodic_maintenance_records
ALTER TABLE public.periodic_maintenance_records ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for periodic_maintenance_records
CREATE POLICY "Anyone can view periodic maintenance records" 
ON public.periodic_maintenance_records 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert periodic maintenance records" 
ON public.periodic_maintenance_records 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update periodic maintenance records" 
ON public.periodic_maintenance_records 
FOR UPDATE 
USING (true);