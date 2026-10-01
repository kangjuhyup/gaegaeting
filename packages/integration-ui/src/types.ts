export type AppConfig = {
  issuer: string;
  clientId: string;
  gatewayUrl: string;
  accountUrl: string;
  redirectUri: string;
};

export type SignupDraft = {
  username: string;
  email: string;
  name: string;
  birthDate: string;
  gender: "FEMALE" | "MALE";
  phoneNumber: string;
};

export type ApiResult<T> = { data?: T; errors?: Array<{ message: string }> };

export type UserProfile = {
  id: string;
  name: string;
  nickname: string;
  gender: "MALE" | "FEMALE";
  birthDate: string;
  region: string;
  bio?: string | null;
  profileImages: string[];
};

export type Pet = {
  id: number;
  name: string;
  age: number;
  gender: "MALE" | "FEMALE";
  breed: string;
  size: string;
  personalities: string[];
  description?: string | null;
  isCertificated: boolean;
  profileImages: string[];
};

export type FeedItem = {
  id: string;
  targetUserId: string;
  state: string;
  showAt: string;
  actionAt: string;
};

export type Feed = {
  id: string;
  date: string;
  slot: string;
  items: FeedItem[];
};
