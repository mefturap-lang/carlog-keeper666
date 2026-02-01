-- Add allow_record_editing to admin_settings
ALTER TABLE public.admin_settings 
ADD COLUMN IF NOT EXISTS allow_record_editing boolean NOT NULL DEFAULT false;

-- Create technicians table
CREATE TABLE public.technicians (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.technicians ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for technicians
CREATE POLICY "Anyone can view technicians" 
ON public.technicians 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert technicians" 
ON public.technicians 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update technicians" 
ON public.technicians 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete technicians" 
ON public.technicians 
FOR DELETE 
USING (true);

-- Insert default technicians
INSERT INTO public.technicians (name) VALUES 
('Görkem'),
('Ümit'),
('Atalay');

-- Create ai_models table for custom AI configurations
CREATE TABLE public.ai_models (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    api_key text,
    api_endpoint text,
    is_default boolean NOT NULL DEFAULT false,
    is_active boolean NOT NULL DEFAULT true,
    model_type text NOT NULL DEFAULT 'custom',
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_models ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for ai_models
CREATE POLICY "Anyone can view ai_models" 
ON public.ai_models 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert ai_models" 
ON public.ai_models 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update ai_models" 
ON public.ai_models 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete ai_models" 
ON public.ai_models 
FOR DELETE 
USING (true);

-- Insert default Lovable AI model
INSERT INTO public.ai_models (name, is_default, is_active, model_type) VALUES 
('Lovable AI (Varsayılan)', true, true, 'lovable');

-- Add trigger for updated_at on technicians
CREATE TRIGGER update_technicians_updated_at
BEFORE UPDATE ON public.technicians
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Add trigger for updated_at on ai_models
CREATE TRIGGER update_ai_models_updated_at
BEFORE UPDATE ON public.ai_models
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();