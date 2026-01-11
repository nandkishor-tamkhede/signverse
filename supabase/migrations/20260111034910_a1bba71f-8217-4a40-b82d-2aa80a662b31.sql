-- First create the updated_at function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create table to track user learning progress
CREATE TABLE public.user_learning_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  level_id INTEGER NOT NULL,
  gesture_id TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  accuracy_score NUMERIC(5,2) DEFAULT 0,
  attempts INTEGER NOT NULL DEFAULT 0,
  best_accuracy NUMERIC(5,2) DEFAULT 0,
  last_practiced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, level_id, gesture_id)
);

-- Create table to track overall level completion
CREATE TABLE public.user_level_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  level_id INTEGER NOT NULL,
  gestures_completed INTEGER NOT NULL DEFAULT 0,
  total_gestures INTEGER NOT NULL,
  is_unlocked BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, level_id)
);

-- Enable RLS
ALTER TABLE public.user_learning_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_level_progress ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_learning_progress
CREATE POLICY "Users can view own learning progress"
ON public.user_learning_progress
FOR SELECT
USING (auth.uid() IS NOT NULL AND user_id = (auth.uid())::text);

CREATE POLICY "Users can insert own learning progress"
ON public.user_learning_progress
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND user_id = (auth.uid())::text);

CREATE POLICY "Users can update own learning progress"
ON public.user_learning_progress
FOR UPDATE
USING (user_id = (auth.uid())::text)
WITH CHECK (user_id = (auth.uid())::text);

-- RLS policies for user_level_progress
CREATE POLICY "Users can view own level progress"
ON public.user_level_progress
FOR SELECT
USING (auth.uid() IS NOT NULL AND user_id = (auth.uid())::text);

CREATE POLICY "Users can insert own level progress"
ON public.user_level_progress
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND user_id = (auth.uid())::text);

CREATE POLICY "Users can update own level progress"
ON public.user_level_progress
FOR UPDATE
USING (user_id = (auth.uid())::text)
WITH CHECK (user_id = (auth.uid())::text);

-- Create triggers for updated_at
CREATE TRIGGER update_user_learning_progress_updated_at
BEFORE UPDATE ON public.user_learning_progress
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_level_progress_updated_at
BEFORE UPDATE ON public.user_level_progress
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();