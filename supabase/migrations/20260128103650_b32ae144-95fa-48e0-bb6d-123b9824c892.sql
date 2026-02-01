-- Add record_status column to service_records table
-- Values: tespit (Detected), devam (In Progress), tamamlandi (Completed)
ALTER TABLE public.service_records ADD COLUMN record_status text DEFAULT 'tespit';

-- Add UPDATE policy for service_records (currently missing)
CREATE POLICY "Anyone can update service records" 
ON public.service_records 
FOR UPDATE 
USING (true);

-- Add DELETE policy for service_records
CREATE POLICY "Anyone can delete service records" 
ON public.service_records 
FOR DELETE 
USING (true);