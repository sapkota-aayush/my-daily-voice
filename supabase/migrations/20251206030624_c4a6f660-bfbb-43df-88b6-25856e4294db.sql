-- Create tasks table
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'missed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create daily reflections table
CREATE TABLE public.daily_reflections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  mood TEXT,
  reflection_summary TEXT,
  completion_rate INTEGER DEFAULT 0,
  morning_plan_recorded BOOLEAN DEFAULT false,
  evening_checkin_recorded BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security (allow all for single-user prototype)
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_reflections ENABLE ROW LEVEL SECURITY;

-- Create policies allowing public access for prototype
CREATE POLICY "Allow all access to tasks" ON public.tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to reflections" ON public.daily_reflections FOR ALL USING (true) WITH CHECK (true);

-- Create index for faster date lookups
CREATE INDEX idx_tasks_date ON public.tasks(date);
CREATE INDEX idx_reflections_date ON public.daily_reflections(date);