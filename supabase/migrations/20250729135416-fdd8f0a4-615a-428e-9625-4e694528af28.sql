-- Fix function search paths for security
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = ''
AS $$
BEGIN
    INSERT INTO public.profiles (user_id, full_name)
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data->>'full_name', 'Student')
    );
    RETURN new;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Enable RLS on subjects table (the one missing from before)
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for subjects
CREATE POLICY "Subjects are viewable by everyone" 
ON public.subjects FOR SELECT 
USING (true);