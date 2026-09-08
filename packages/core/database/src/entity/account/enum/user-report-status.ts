/**
 * 사용자 신고 상태 열거형
 * 
 * 사용자 신고의 처리 상태를 나타내는 열거형입니다.
 * 데이터베이스에는 숫자 값으로 저장되며, 각 상태는 다음과 같은 의미를 가집니다.
 */
export const UserReportStatus = {
    /**
     * 대기 상태
     * 신고가 접수되어 처리 대기 중인 상태
     */
    PENDING : { label : 'PENDING' , value : 0 },
    
    /**
     * 처리 중 상태
     * 신고가 검토 중인 상태
     */
    PROCESSING : { label : 'PROCESSING' , value : 1 },
    
    /**
     * 처리 완료 상태
     * 신고가 처리되어 완료된 상태
     */
    RESOLVED : { label : 'RESOLVED' , value : 2 },
    
    /**
     * 거부 상태
     * 신고가 기각되거나 무효 처리된 상태
     */
    REJECTED : { label : 'REJECTED' , value : 3 },
} as const;

/**
 * 사용자 신고 상태 타입
 */
export type UserReportStatus = typeof UserReportStatus[keyof typeof UserReportStatus];

