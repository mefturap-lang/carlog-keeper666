-- Create qr_mappings table to store QR content to slot mappings
CREATE TABLE public.qr_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_number INTEGER NOT NULL UNIQUE,
  qr_content TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.qr_mappings ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (same as other tables in this app)
CREATE POLICY "Anyone can view qr_mappings" 
ON public.qr_mappings 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert qr_mappings" 
ON public.qr_mappings 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update qr_mappings" 
ON public.qr_mappings 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete qr_mappings" 
ON public.qr_mappings 
FOR DELETE 
USING (true);

-- Add index for faster lookups
CREATE INDEX idx_qr_mappings_qr_content ON public.qr_mappings(qr_content);
CREATE INDEX idx_qr_mappings_slot_number ON public.qr_mappings(slot_number);