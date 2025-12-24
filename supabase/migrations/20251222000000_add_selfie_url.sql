-- Add selfie_url column to daily_reflections table
ALTER TABLE public.daily_reflections 
ADD COLUMN IF NOT EXISTS selfie_url TEXT;

