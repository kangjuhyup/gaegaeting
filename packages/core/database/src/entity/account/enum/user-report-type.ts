/**
 * 사용자 신고 유형 열거형
 * 
 * 사용자 신고의 유형을 나타내는 열거형입니다.
 * 데이터베이스에는 숫자 값으로 저장되며, 각 유형은 다음과 같은 의미를 가집니다.
 */
export const UserReportType = {
    /**
     * 부적절한 프로필
     * 부적절한 사진, 닉네임, 자기소개 등
     */
    INAPPROPRIATE_PROFILE : { label : 'INAPPROPRIATE_PROFILE' , value : 0 },
    
    /**
     * 스팸/광고
     * 스팸 메시지나 광고성 콘텐츠
     */
    SPAM : { label : 'SPAM' , value : 1 },
    
    /**
     * 괴롭힘/욕설
     * 괴롭힘, 욕설, 비방 등의 행위
     */
    HARASSMENT : { label : 'HARASSMENT' , value : 2 },
    
    /**
     * 사기/부정행위
     * 사기, 부정행위, 허위 정보 제공
     */
    FRAUD : { label : 'FRAUD' , value : 3 },
    
    /**
     * 기타
     * 위에 해당하지 않는 기타 사유
     */
    OTHER : { label : 'OTHER' , value : 4 },
} as const;

/**
 * 사용자 신고 유형 타입
 */
export type UserReportType = typeof UserReportType[keyof typeof UserReportType];

