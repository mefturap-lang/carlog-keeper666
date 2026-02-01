-- Create admin_settings table for storing admin panel configuration
CREATE TABLE public.admin_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    username text NOT NULL DEFAULT 'umit',
    password_hash text NOT NULL DEFAULT 'gorkem',
    require_password boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- Only authenticated admins can view/update settings
CREATE POLICY "Admins can view settings" 
ON public.admin_settings 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can update settings" 
ON public.admin_settings 
FOR UPDATE 
USING (true);

-- Insert default settings
INSERT INTO public.admin_settings (username, password_hash, require_password)
VALUES ('umit', 'gorkem', true);