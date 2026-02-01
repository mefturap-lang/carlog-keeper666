-- Create vehicles table
CREATE TABLE public.vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_code text UNIQUE NOT NULL,
  chassis_number text NOT NULL,
  plate_number text NOT NULL,
  brand text NOT NULL,
  model text NOT NULL,
  year integer NOT NULL,
  color text NOT NULL,
  current_km integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create service records table
CREATE TABLE public.service_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  km_at_service integer NOT NULL,
  service_date timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create vehicle photos table
CREATE TABLE public.vehicle_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  position text NOT NULL CHECK (position IN ('front', 'back', 'left', 'right')),
  photo_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_photos ENABLE ROW LEVEL SECURITY;

-- RLS Policies for vehicles (public read access for QR scanning)
CREATE POLICY "Anyone can view vehicles"
  ON public.vehicles FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert vehicles"
  ON public.vehicles FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update vehicles"
  ON public.vehicles FOR UPDATE
  USING (true);

-- RLS Policies for service_records
CREATE POLICY "Anyone can view service records"
  ON public.service_records FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert service records"
  ON public.service_records FOR INSERT
  WITH CHECK (true);

-- RLS Policies for vehicle_photos
CREATE POLICY "Anyone can view vehicle photos"
  ON public.vehicle_photos FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert vehicle photos"
  ON public.vehicle_photos FOR INSERT
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX idx_vehicles_qr_code ON public.vehicles(qr_code);
CREATE INDEX idx_service_records_vehicle_id ON public.service_records(vehicle_id);
CREATE INDEX idx_service_records_date ON public.service_records(service_date DESC);
CREATE INDEX idx_vehicle_photos_vehicle_id ON public.vehicle_photos(vehicle_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for vehicles
CREATE TRIGGER set_vehicles_updated_at
  BEFORE UPDATE ON public.vehicles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();