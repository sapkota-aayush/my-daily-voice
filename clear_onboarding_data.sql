-- Clear all onboarding data
-- Run this in Supabase Dashboard → SQL Editor

-- Delete all onboarding transcripts
DELETE FROM public.onboarding_transcripts;

-- Verify it's empty
SELECT COUNT(*) as remaining_records FROM public.onboarding_transcripts;
