-- Add user_id to daily_reflections table
ALTER TABLE public.daily_reflections 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id to onboarding_transcripts table
ALTER TABLE public.onboarding_transcripts 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id to tasks table (if it exists)
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create indexes for user_id lookups
CREATE INDEX IF NOT EXISTS idx_daily_reflections_user_id ON public.daily_reflections(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_reflections_user_date ON public.daily_reflections(user_id, date);
CREATE INDEX IF NOT EXISTS idx_onboarding_transcripts_user_id ON public.onboarding_transcripts(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks(user_id);

-- Drop old public access policies
DROP POLICY IF EXISTS "Allow all access to tasks" ON public.tasks;
DROP POLICY IF EXISTS "Allow all access to reflections" ON public.daily_reflections;

-- Create user-specific RLS policies for daily_reflections
CREATE POLICY "Users can view their own reflections"
  ON public.daily_reflections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reflections"
  ON public.daily_reflections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reflections"
  ON public.daily_reflections FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reflections"
  ON public.daily_reflections FOR DELETE
  USING (auth.uid() = user_id);

-- Create user-specific RLS policies for onboarding_transcripts
CREATE POLICY "Users can view their own onboarding transcripts"
  ON public.onboarding_transcripts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own onboarding transcripts"
  ON public.onboarding_transcripts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own onboarding transcripts"
  ON public.onboarding_transcripts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create user-specific RLS policies for tasks
CREATE POLICY "Users can view their own tasks"
  ON public.tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tasks"
  ON public.tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tasks"
  ON public.tasks FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tasks"
  ON public.tasks FOR DELETE
  USING (auth.uid() = user_id);

-- Remove unique constraint on date in daily_reflections (now needs to be unique per user)
ALTER TABLE public.daily_reflections 
DROP CONSTRAINT IF EXISTS daily_reflections_date_key;

-- Add unique constraint on user_id + date
ALTER TABLE public.daily_reflections 
ADD CONSTRAINT daily_reflections_user_date_unique UNIQUE (user_id, date);
