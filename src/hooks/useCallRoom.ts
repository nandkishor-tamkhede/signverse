import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CallRoom } from '@/types/call';

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function useCallRoom() {
  const [room, setRoom] = useState<CallRoom | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createRoom = useCallback(async (createdBy?: string): Promise<CallRoom | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const roomCode = generateRoomCode();
      
      const { data, error: insertError } = await (supabase
        .from('call_rooms') as any)
        .insert({
          room_code: roomCode,
          created_by: createdBy || null,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const callRoom = data as CallRoom;
      setRoom(callRoom);
      return callRoom;
    } catch (err) {
      console.error('[CallRoom] Error creating room:', err);
      setError('Failed to create room');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const joinRoom = useCallback(async (roomCode: string): Promise<CallRoom | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await (supabase
        .from('call_rooms') as any)
        .select('*')
        .eq('room_code', roomCode.toUpperCase())
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          throw new Error('Room not found or has expired');
        }
        throw fetchError;
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

  const leaveRoom = useCallback(async () => {
    setRoom(null);
    setError(null);
  }, []);

  return {
    room,
    isLoading,
    error,
    createRoom,
    joinRoom,
    leaveRoom,
  };
}
