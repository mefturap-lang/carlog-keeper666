-- Add owner information columns to vehicles table
ALTER TABLE public.vehicles 
ADD COLUMN owner_name TEXT,
ADD COLUMN owner_phone TEXT,
ADD COLUMN owner_address TEXT;