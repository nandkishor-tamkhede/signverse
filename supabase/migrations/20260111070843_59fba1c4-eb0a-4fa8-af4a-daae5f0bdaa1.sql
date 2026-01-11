-- Fix call_signals DELETE policy to require room participation
DROP POLICY IF EXISTS "Users can delete own signals" ON public.call_signals;

CREATE POLICY "Participants can delete own signals"
ON public.call_signals
FOR DELETE
USING (
  sender_id = auth.uid()::text 
  AND public.is_room_participant(room_id, auth.uid())
);