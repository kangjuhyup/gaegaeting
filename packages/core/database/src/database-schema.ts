export const DatabaseSchema = {
  USER: 'USER',
  MATCH: 'MATCH',
  CHAT: 'CHAT',
} as const;

export type DatabaseSchema =
  (typeof DatabaseSchema)[keyof typeof DatabaseSchema];
