-- Create call_rooms table for video call signaling
CREATE TABLE public.call_rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_code TEXT NOT NULL UNIQUE,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '24 hours'),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Create call_signals table for WebRTC signaling
CREATE TABLE public.call_signals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.call_rooms(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL,
  signal_type TEXT NOT NULL CHECK (signal_type IN ('offer', 'answer', 'ice-candidate', 'gesture', 'text')),
  signal_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_call_signals_room_id ON public.call_signals(room_id);
CREATE INDEX idx_call_rooms_room_code ON public.call_rooms(room_code);
CREATE INDEX idx_call_rooms_active ON public.call_rooms(is_active, expires_at);

-- Enable Row Level Security
ALTER TABLE public.call_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_signals ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read and create rooms (no auth required for this app)
CREATE POLICY "Anyone can view active rooms" 
ON public.call_rooms 
FOR SELECT 
USING (is_active = true AND expires_at > now());

CREATE POLICY "Anyone can create rooms" 
ON public.call_rooms 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update rooms" 
ON public.call_rooms 
FOR UPDATE 
USING (true);

-- Allow anyone to manage signals in active rooms
CREATE POLICY "Anyone can view signals" 
ON public.call_signals 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create signals" 
ON public.call_signals 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can delete signals" 
ON public.call_signals 
FOR DELETE 
USING (true);

-- Enable realtime for signals table
ALTER PUBLICATION supabase_realtime ADD TABLE public.call_signals;

-- Function to clean up old signals
CREATE OR REPLACE FUNCTION public.cleanup_old_signals()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete signals older than 30 seconds
  DELETE FROM public.call_signals 
  WHERE created_at < now() - INTERVAL '30 seconds';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger to clean up old signals on insert
CREATE TRIGGER cleanup_signals_trigger
AFTER INSERT ON public.call_signals
FOR EACH STATEMENT
EXECUTE FUNCTION public.cleanup_old_signals();