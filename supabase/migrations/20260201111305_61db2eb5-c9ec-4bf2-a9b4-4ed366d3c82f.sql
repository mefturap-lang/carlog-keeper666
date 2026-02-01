-- Add new vehicle detail columns
ALTER TABLE public.vehicles
ADD COLUMN IF NOT EXISTS body_type text,
ADD COLUMN IF NOT EXISTS body_code text,
ADD COLUMN IF NOT EXISTS package text,
ADD COLUMN IF NOT EXISTS has_heavy_damage boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS first_registration_date date;