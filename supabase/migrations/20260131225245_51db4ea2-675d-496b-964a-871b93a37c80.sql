-- Add DELETE policy for vehicles table
CREATE POLICY "Anyone can delete vehicles"
ON public.vehicles
FOR DELETE
USING (true);

-- Add DELETE policy for vehicle_summaries table
CREATE POLICY "Anyone can delete vehicle summaries"
ON public.vehicle_summaries
FOR DELETE
USING (true);

-- Add DELETE policy for periodic_maintenance_records table
CREATE POLICY "Anyone can delete periodic maintenance records"
ON public.periodic_maintenance_records
FOR DELETE
USING (true);

-- Add DELETE policy for vehicle_photos table
CREATE POLICY "Anyone can delete vehicle photos"
ON public.vehicle_photos
FOR DELETE
USING (true);