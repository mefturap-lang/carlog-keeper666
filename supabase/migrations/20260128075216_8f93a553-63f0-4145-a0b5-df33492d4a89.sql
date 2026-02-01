-- Create planned_maintenance table for tracking upcoming services
CREATE TABLE public.planned_maintenance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  planned_date DATE NOT NULL,
  planned_km INTEGER,
  notes TEXT,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.planned_maintenance ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view planned maintenance"
ON public.planned_maintenance FOR SELECT
USING (true);

CREATE POLICY "Anyone can insert planned maintenance"
ON public.planned_maintenance FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update planned maintenance"
ON public.planned_maintenance FOR UPDATE
USING (true);

CREATE POLICY "Anyone can delete planned maintenance"
ON public.planned_maintenance FOR DELETE
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_planned_maintenance_updated_at
BEFORE UPDATE ON public.planned_maintenance
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Create vehicle_summaries table for storing AI-generated summaries
CREATE TABLE public.vehicle_summaries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE UNIQUE,
  summary_text TEXT,
  suggestions TEXT,
  last_service_record_count INTEGER DEFAULT 0,
  last_updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vehicle_summaries ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view vehicle summaries"
ON public.vehicle_summaries FOR SELECT
USING (true);

CREATE POLICY "Anyone can insert vehicle summaries"
ON public.vehicle_summaries FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update vehicle summaries"
ON public.vehicle_summaries FOR UPDATE
USING (true);