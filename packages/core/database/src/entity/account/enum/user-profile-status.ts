/**
 * 사용자 프로필 상태 열거형
 * 
 * 사용자 프로필의 활성화 상태를 나타내는 열거형입니다.
 * 데이터베이스에는 숫자 값으로 저장되며, 각 상태는 다음과 같은 의미를 가집니다.
 */
export const UserProfileStatus = {
    /**
     * 활성화 상태
     * 정상적으로 사용 중인 프로필
     */
    ACTIVE : { label : 'ACTIVE' , value : 0 },
    
    /**
     * 비활성화 상태
     * 일시적으로 사용이 중지된 프로필
     */
    INACTIVE : { label : 'INACTIVE' , value : 1 },
    
    /**
     * 정지 상태
     * 규정 위반 등으로 인해 정지된 프로필
     */
    SUSPENDED : { label : 'SUSPENDED' , value : 2 },
    
    /**
     * 삭제 상태
     * 삭제된 프로필 (소프트 삭제)
     */
    DELETED : { label : 'DELETED' , value : 3 },
} as const;

/**
 * 사용자 프로필 상태 타입
 */
export type UserProfileStatus = typeof UserProfileStatus[keyof typeof UserProfileStatus];