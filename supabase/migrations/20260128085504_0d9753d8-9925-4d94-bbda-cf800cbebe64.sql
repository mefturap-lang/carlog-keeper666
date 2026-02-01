-- Create fault_detections table for storing fault analysis data
CREATE TABLE public.fault_detections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  fault_codes TEXT[] DEFAULT '{}',
  customer_complaint TEXT,
  technician_observation TEXT,
  analysis_result JSONB,
  is_analyzed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create fault_detection_photos table
CREATE TABLE public.fault_detection_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fault_detection_id UUID NOT NULL REFERENCES public.fault_detections(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  description TEXT,
  photo_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.fault_detections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fault_detection_photos ENABLE ROW LEVEL SECURITY;

-- RLS policies for fault_detections
CREATE POLICY "Anyone can view fault detections" ON public.fault_detections FOR SELECT USING (true);
CREATE POLICY "Anyone can insert fault detections" ON public.fault_detections FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update fault detections" ON public.fault_detections FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete fault detections" ON public.fault_detections FOR DELETE USING (true);

-- RLS policies for fault_detection_photos
CREATE POLICY "Anyone can view fault detection photos" ON public.fault_detection_photos FOR SELECT USING (true);
CREATE POLICY "Anyone can insert fault detection photos" ON public.fault_detection_photos FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete fault detection photos" ON public.fault_detection_photos FOR DELETE USING (true);

-- Create storage bucket for fault photos
INSERT INTO storage.buckets (id, name, public) VALUES ('fault-photos', 'fault-photos', true);

-- Storage policies
CREATE POLICY "Anyone can view fault photos" ON storage.objects FOR SELECT USING (bucket_id = 'fault-photos');
CREATE POLICY "Anyone can upload fault photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'fault-photos');
CREATE POLICY "Anyone can delete fault photos" ON storage.objects FOR DELETE USING (bucket_id = 'fault-photos');

-- Add trigger for updated_at
CREATE TRIGGER update_fault_detections_updated_at
  BEFORE UPDATE ON public.fault_detections
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();