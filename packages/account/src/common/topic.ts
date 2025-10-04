// <bounded-context>.<domain>.<action>.<version>

import { AccountUserPhoneVerifiedV1Payload } from "./payload";

export const Topics = {
    ACCOUNT_USER_PHONE_VERIFIED_V1 : 'account.user.phoneVerified.v1',
} as const;

export type Topics = typeof Topics[keyof typeof Topics];

// 토픽별 페이로드 타입 매핑
export interface TopicPayloadMap {
    [Topics.ACCOUNT_USER_PHONE_VERIFIED_V1]: AccountUserPhoneVerifiedV1Payload;
}