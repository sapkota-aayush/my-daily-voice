-- Add conversation_transcript column to daily_reflections table
ALTER TABLE public.daily_reflections 
ADD COLUMN IF NOT EXISTS conversation_transcript JSONB;

-- Add comment
COMMENT ON COLUMN public.daily_reflections.conversation_transcript IS 'Stores conversation transcript as JSONB array for resuming conversations';
