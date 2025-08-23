// <bounded-context>.<domain>.<action>.<version>
export const Topics = {
    MATCH_FEED_LIKE_V1 : 'match.feed.like.v1',
    MATCH_PAIR_CREATED_V1 : 'match.pair.created.v1',
    CHAT_ROOM_CREATED_V1 : 'chat.room.created.v1',
} as const;

export type Topics = typeof Topics[keyof typeof Topics];