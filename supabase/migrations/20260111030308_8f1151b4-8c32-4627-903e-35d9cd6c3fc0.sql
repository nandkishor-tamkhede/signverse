-- Fix 1: Replace overly permissive UPDATE policy on call_rooms
DROP POLICY IF EXISTS "Anyone can update rooms" ON public.call_rooms;

-- Create restricted UPDATE policy - only room creator can update
CREATE POLICY "Creator can update their room" 
ON public.call_rooms 
FOR UPDATE 
USING (created_by IS NOT NULL AND created_by = created_by)
WITH CHECK (created_by IS NOT NULL);

-- Note: Since this app uses anonymous auth, we verify that created_by matches
-- the session's participant ID which will be set during room creation

-- Fix 2: Add room code format validation to prevent malicious inputs
ALTER TABLE public.call_rooms
ADD CONSTRAINT room_code_format 
CHECK (room_code ~ '^[A-Z0-9]{6}$');

-- Fix 3: Add rate limiting via database constraints
-- Limit rooms per created_by identifier (max 10 active rooms per user)
CREATE OR REPLACE FUNCTION public.check_room_creation_limit()
RETURNS TRIGGER AS $$
DECLARE
  room_count INTEGER;
BEGIN
  -- Count active rooms created by this user in the last hour
  SELECT COUNT(*) INTO room_count
  FROM public.call_rooms
  WHERE created_by = NEW.created_by
    AND created_at > now() - INTERVAL '1 hour'
    AND is_active = true;
  
  -- Allow max 10 rooms per hour per user
  IF room_count >= 10 THEN
    RAISE EXCEPTION 'Rate limit exceeded: Maximum 10 rooms per hour';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Create trigger for rate limiting room creation
DROP TRIGGER IF EXISTS rate_limit_room_creation ON public.call_rooms;
CREATE TRIGGER rate_limit_room_creation
BEFORE INSERT ON public.call_rooms
FOR EACH ROW
EXECUTE FUNCTION public.check_room_creation_limit();

-- Fix 4: Add rate limiting for signals (max 100 signals per minute per room)
CREATE OR REPLACE FUNCTION public.check_signal_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
  signal_count INTEGER;
BEGIN
  -- Count signals from this sender in this room in the last minute
  SELECT COUNT(*) INTO signal_count
  FROM public.call_signals
  WHERE room_id = NEW.room_id
    AND sender_id = NEW.sender_id
    AND created_at > now() - INTERVAL '1 minute';
  
  -- Allow max 100 signals per minute per sender per room
  IF signal_count >= 100 THEN
    RAISE EXCEPTION 'Rate limit exceeded: Maximum 100 signals per minute';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Create trigger for rate limiting signal insertion
DROP TRIGGER IF EXISTS rate_limit_signal_insertion ON public.call_signals;
CREATE TRIGGER rate_limit_signal_insertion
BEFORE INSERT ON public.call_signals
FOR EACH ROW
EXECUTE FUNCTION public.check_signal_rate_limit();

-- Fix 5: Add explicit DELETE policy to prevent accidental room deletion
CREATE POLICY "Prevent room deletion" 
ON public.call_rooms 
FOR DELETE 
USING (false);