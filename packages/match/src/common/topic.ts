// <bounded-context>.<domain>.<action>.<version>
import { MatchFeedLikeV1Payload, MatchPairCreatedV1Payload, NotificationFcmSendV1Payload } from "./payload";

export const Topics = {
    MATCH_FEED_LIKE_V1 : 'match.feed.like.v1',
    NOTIFICATION_FCM_SEND_V1 : 'notification.fcm.send.v1',
    MATCH_PAIR_CREATED_V1 : 'match.pair.created.v1',
    CHAT_ROOM_CREATED_V1 : 'chat.room.created.v1',
} as const;

export type Topics = typeof Topics[keyof typeof Topics];

// 토픽별 페이로드 타입 매핑
export interface TopicPayloadMap {
    [Topics.MATCH_FEED_LIKE_V1]: MatchFeedLikeV1Payload;
    [Topics.NOTIFICATION_FCM_SEND_V1]: NotificationFcmSendV1Payload;
    [Topics.MATCH_PAIR_CREATED_V1]: MatchPairCreatedV1Payload; // 추후 정의 필요
    [Topics.CHAT_ROOM_CREATED_V1]: any; // 추후 정의 필요
}