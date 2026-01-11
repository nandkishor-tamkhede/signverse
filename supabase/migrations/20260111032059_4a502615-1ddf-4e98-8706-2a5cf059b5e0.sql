-- Fix the security definer view issue by recreating as SECURITY INVOKER
-- Drop the existing view
DROP VIEW IF EXISTS public.public_rooms;

-- Recreate view with explicit SECURITY INVOKER (default in newer Postgres, but be explicit)
-- Note: Standard views in Postgres don't have SECURITY DEFINER by default, 
-- but the linter may flag it. We can use a function-based approach instead.

-- Create a secure function to get public room data (excludes created_by)
CREATE OR REPLACE FUNCTION public.get_public_rooms()
RETURNS TABLE (
  id uuid,
  room_code text,
  created_at timestamp with time zone,
  expires_at timestamp with time zone,
  is_active boolean
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT 
    cr.id,
    cr.room_code,
    cr.created_at,
    cr.expires_at,
    cr.is_active
  FROM public.call_rooms cr
  WHERE cr.is_active = true 
    AND cr.expires_at > now();
$$;

-- Grant execute on the function to authenticated and anon users
GRANT EXECUTE ON FUNCTION public.get_public_rooms() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_rooms() TO anon;