import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';

type AuthState = {
  session: Session | null;
  ready: boolean;
  setSession: (session: Session | null) => void;
};

export const useAuth = create<AuthState>((set) => ({
  session: null,
  ready: false,
  setSession: (session) => set({ session, ready: true }),
}));

// Giriş gerektiren ekranlarda oturum her zaman vardır (bkz. app/_layout.tsx)
export const useMyId = () => useAuth((s) => s.session?.user.id ?? '');
