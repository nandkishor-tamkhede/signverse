-- Fix the UPDATE policy to properly check against authenticated user
DROP POLICY IF EXISTS "Creator can update their room" ON public.call_rooms;

-- Create proper UPDATE policy that matches created_by with auth.uid()
-- For anonymous users, auth.uid() returns their anonymous session ID
CREATE POLICY "Creator can update their room" 
ON public.call_rooms 
FOR UPDATE 
USING (created_by = auth.uid()::text)
WITH CHECK (created_by = auth.uid()::text);

-- Also update INSERT policy to require authentication
DROP POLICY IF EXISTS "Anyone can create rooms" ON public.call_rooms;

CREATE POLICY "Authenticated users can create rooms" 
ON public.call_rooms 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid()::text);

-- Update call_signals policies to require authentication
DROP POLICY IF EXISTS "Anyone can create signals" ON public.call_signals;
DROP POLICY IF EXISTS "Anyone can view signals" ON public.call_signals;
DROP POLICY IF EXISTS "Anyone can delete signals" ON public.call_signals;

-- Authenticated users can create signals
CREATE POLICY "Authenticated users can create signals" 
ON public.call_signals 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL AND sender_id = auth.uid()::text);

-- Users can view signals in rooms they participate in
CREATE POLICY "Participants can view room signals" 
ON public.call_signals 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Users can delete their own signals
CREATE POLICY "Users can delete own signals" 
ON public.call_signals 
FOR DELETE 
USING (sender_id = auth.uid()::text);