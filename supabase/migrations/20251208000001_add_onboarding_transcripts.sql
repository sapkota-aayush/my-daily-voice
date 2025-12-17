-- Create onboarding_transcripts table
CREATE TABLE public.onboarding_transcripts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transcript JSONB NOT NULL, -- Full conversation transcript as JSON array
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  extracted_at TIMESTAMP WITH TIME ZONE, -- When memory extraction was completed
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.onboarding_transcripts ENABLE ROW LEVEL SECURITY;

-- Create policy allowing public access for prototype
CREATE POLICY "Allow all access to onboarding_transcripts" 
ON public.onboarding_transcripts 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX idx_onboarding_transcripts_created_at ON public.onboarding_transcripts(created_at);
