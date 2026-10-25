import { create } from 'zustand';

export type Audience = 'everyone' | 'friends';

type SettingsState = {
  storyAudience: Audience;
  notifyInvites: boolean;
  notifyMessages: boolean;
  notifyFriends: boolean;
  set: (patch: Partial<Omit<SettingsState, 'set'>>) => void;
};

export const useSettings = create<SettingsState>((set) => ({
  storyAudience: 'everyone',
  notifyInvites: true,
  notifyMessages: true,
  notifyFriends: false,
  set: (patch) => set(patch),
}));
