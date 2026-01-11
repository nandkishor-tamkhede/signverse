export type UserRole = 'signer' | 'listener';

export interface CallRoom {
  id: string;
  room_code: string;
  created_by: string | null;
  created_at: string;
  expires_at: string;
  is_active: boolean;
}

export interface CallSignal {
  id: string;
  room_id: string;
  sender_id: string;
  signal_type: 'offer' | 'answer' | 'ice-candidate' | 'gesture' | 'text';
  signal_data: Record<string, unknown>;
  created_at: string;
}

export interface CallState {
  status: 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error';
  error?: string;
  localStream?: MediaStream;
  remoteStream?: MediaStream;
}

export interface GestureMessage {
  gesture: string;
  text: string;
  hindiText?: string;
  confidence: number;
  timestamp: number;
}
