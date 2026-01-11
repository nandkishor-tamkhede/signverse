-- Fix Issue 1: Restrict call_signals SELECT to room participants only
-- First, add a room_participants table to track who is in which room
CREATE TABLE IF NOT EXISTS public.room_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.call_rooms(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  joined_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(room_id, user_id)
);

-- Enable RLS on room_participants
ALTER TABLE public.room_participants ENABLE ROW LEVEL SECURITY;

-- Participants can view room participants
CREATE POLICY "Users can view room participants"
ON public.room_participants
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Users can add themselves as participants
CREATE POLICY "Users can join rooms"
ON public.room_participants
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid()::text);

-- Users can remove themselves from rooms
CREATE POLICY "Users can leave rooms"
ON public.room_participants
FOR DELETE
USING (user_id = auth.uid()::text);

-- Create a function to check if user is participant in a room
CREATE OR REPLACE FUNCTION public.is_room_participant(room_id_param uuid, user_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.room_participants
    WHERE room_id = room_id_param AND user_id = user_id_param::text
  ) OR EXISTS (
    SELECT 1 FROM public.call_rooms
    WHERE id = room_id_param AND created_by = user_id_param::text
  )
$$;

-- Drop the overly permissive signal SELECT policy
DROP POLICY IF EXISTS "Participants can view room signals" ON public.call_signals;

-- Create restrictive policy - only room participants can view signals
CREATE POLICY "Room participants can view signals"
ON public.call_signals
FOR SELECT
USING (public.is_room_participant(room_id, auth.uid()));

-- Fix Issue 2: Hide created_by from public room queries
-- Create a view for public room access that excludes sensitive fields
CREATE OR REPLACE VIEW public.public_rooms AS
SELECT id, room_code, created_at, expires_at, is_active
FROM public.call_rooms
WHERE is_active = true AND expires_at > now();

-- Grant SELECT on the view to authenticated and anon users
GRANT SELECT ON public.public_rooms TO authenticated;
GRANT SELECT ON public.public_rooms TO anon;

-- Update the call_rooms SELECT policy to require authentication
DROP POLICY IF EXISTS "Anyone can view active rooms" ON public.call_rooms;

-- Only authenticated users can view rooms (still needed for room creator operations)
CREATE POLICY "Authenticated users can view active rooms"
ON public.call_rooms
FOR SELECT
USING (auth.uid() IS NOT NULL AND is_active = true AND expires_at > now());