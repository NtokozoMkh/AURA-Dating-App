export interface UserProfile {
  id: string;
  name: string;
  age: number;
  gender: string;
  lookingFor: string;
  bio: string;
  occupation: string;
  interests: string[];
  mbti: string;
  personalityAnswers: { [key: string]: number }; // sliders from -5 to 5
  isVerified: boolean;
  verificationVideoUrl?: string;
  verificationStatus: 'unverified' | 'pending' | 'verified' | 'failed';
  avatarUrl: string;
  isPremium?: boolean;
  subscriptionPlan?: 'none' | 'gold' | 'infinite';
  subscriptionExpiresAt?: number;
}

export interface MatchProfile {
  id: string;
  name: string;
  age: number;
  gender: string;
  occupation: string;
  bio: string;
  interests: string[];
  mbti: string;
  personalityAnswers: { [key: string]: number };
  avatarUrl: string;
  isVerified: boolean;
  compatibilityScore?: number;
  compatibilityReport?: string;
}

export interface ChatMessage {
  id: string;
  matchId: string;
  senderId: string; // 'user' or the match ID
  text: string;
  createdAt: number; // timestamp
  mediaUrl?: string;
  mediaType?: 'image' | 'audio';
  voiceDuration?: number;
}

export interface Match {
  id: string;
  profile: MatchProfile;
  matchedAt: number;
  lastMessage?: ChatMessage;
}

export interface UserAccount {
  id: string;
  username: string;
  passwordHash: string;
  profile: UserProfile;
  swipes: { [profileId: string]: "left" | "right" };
  matches: Match[];
  messages: ChatMessage[];
}

