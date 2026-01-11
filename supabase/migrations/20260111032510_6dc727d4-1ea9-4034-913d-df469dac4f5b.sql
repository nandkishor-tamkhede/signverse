-- Fix: Restrict room_participants SELECT to only show participants in rooms the user is part of
DROP POLICY IF EXISTS "Users can view room participants" ON public.room_participants;

-- Create restrictive policy - users can only see participants in rooms they're also in
CREATE POLICY "Users can view room participants in their rooms"
ON public.room_participants
FOR SELECT
USING (public.is_room_participant(room_id, auth.uid()));