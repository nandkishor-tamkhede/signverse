import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CallRoom } from '@/types/call';
import { RateLimiter } from '@/lib/throttle';

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// Rate limiter: max 5 room creations per 10 minutes
const roomCreationLimiter = new RateLimiter(5, 10 * 60 * 1000);

export function useCallRoom() {
  const [room, setRoom] = useState<CallRoom | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastCreateAttemptRef = useRef<number>(0);

  const createRoom = useCallback(async (userId: string): Promise<CallRoom | null> => {
    // Client-side rate limiting
    if (!roomCreationLimiter.canProceed()) {
      setError('Rate limit exceeded. Please wait before creating another room.');
      return null;
    }

    // Throttle: min 3 seconds between attempts
    const now = Date.now();
    if (now - lastCreateAttemptRef.current < 3000) {
      setError('Please wait a moment before creating another room.');
      return null;
    }
    lastCreateAttemptRef.current = now;

    setIsLoading(true);
    setError(null);

    try {
      const roomCode = generateRoomCode();
      
      const { data, error: insertError } = await (supabase
        .from('call_rooms') as any)
        .insert({
          room_code: roomCode,
          created_by: userId,
        })
        .select()
        .single();

      if (insertError) {
        // Handle rate limit error from database
        if (insertError.message?.includes('Rate limit exceeded')) {
          throw new Error('Too many rooms created. Please wait before trying again.');
        }
        throw insertError;
      }

      // Register creator as a participant
      await (supabase.from('room_participants') as any).insert({
        room_id: data.id,
        user_id: userId,
      });

      roomCreationLimiter.recordOperation();
      const callRoom = data as CallRoom;
      setRoom(callRoom);
      return callRoom;
    } catch (err) {
      console.error('[CallRoom] Error creating room:', err);
      setError(err instanceof Error ? err.message : 'Failed to create room');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const joinRoom = useCallback(async (roomCode: string, userId: string): Promise<CallRoom | null> => {
    // Basic input validation
    const sanitizedCode = roomCode.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (sanitizedCode.length !== 6) {
      setError('Invalid room code format');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await (supabase
        .from('call_rooms') as any)
        .select('*')
        .eq('room_code', sanitizedCode)
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          throw new Error('Room not found or has expired');
        }
        throw fetchError;
      }

      // Register joiner as a participant (check if already exists first)
      const { data: existingParticipant } = await (supabase
        .from('room_participants') as any)
        .select('id')
        .eq('room_id', data.id)
        .eq('user_id', userId)
        .maybeSingle();

      if (!existingParticipant) {
        const { error: participantError } = await (supabase
          .from('room_participants') as any)
          .insert({
            room_id: data.id,
            user_id: userId,
          });
        
        if (participantError) {
          console.warn('[CallRoom] Could not register as participant:', participantError.message);
        }
      }

      const callRoom = data as CallRoom;
      setRoom(callRoom);
      return callRoom;
    } catch (err) {
      console.error('[CallRoom] Error joining room:', err);
      setError(err instanceof Error ? err.message : 'Failed to join room');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const leaveRoom = useCallback(async (userId?: string) => {
    // Remove user from participants if userId provided
    if (room && userId) {
      await (supabase.from('room_participants') as any)
        .delete()
        .eq('room_id', room.id)
        .eq('user_id', userId);
    }
    setRoom(null);
    setError(null);
  }, [room]);

  return {
    room,
    isLoading,
    error,
    createRoom,
    joinRoom,
    leaveRoom,
  };
}
