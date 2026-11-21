export type Audience = 'everyone' | 'friends';

// Konum kolonları güvenlik için doğrudan okunamaz; harita verisi map_users() fonksiyonundan gelir
export type Profile = {
  id: string;
  name: string;
  username: string;
  avatar_url: string | null;
  show_on_map: boolean;
  story_audience: Audience;
  notify_invites: boolean;
  notify_messages: boolean;
  notify_friends: boolean;
};

export type ProfileUpdate = Partial<Omit<Profile, 'id'>> & { latitude?: number; longitude?: number };

export type ProfileSummary = Pick<Profile, 'id' | 'name' | 'username' | 'avatar_url'>;

export type Story = {
  id: string;
  user_id: string;
  image_url: string;
  caption: string;
  created_at: string;
};

export type MapUser = ProfileSummary & {
  latitude: number;
  longitude: number;
  stories: Story[];
};

export type EventVisibility = 'public' | 'private';
export type MemberStatus = 'requested' | 'joined';

export type EventMember = {
  user_id: string;
  status: MemberStatus;
  profile: ProfileSummary | null;
};

export type CaddeEvent = {
  id: string;
  host_id: string;
  title: string;
  description: string;
  place: string;
  starts_at: string;
  visibility: EventVisibility;
  cover_url: string | null;
  host: ProfileSummary | null;
  members: EventMember[];
};

export type Message = {
  id: string;
  event_id: string;
  user_id: string;
  text: string;
  created_at: string;
  profile: ProfileSummary | null;
};

export type ReportTarget = 'user' | 'story' | 'event' | 'message';
export type ReportReason = 'spam' | 'harassment' | 'inappropriate' | 'fake' | 'other';
