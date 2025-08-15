export const UserGender = {
    MALE : { label : "MALE", value : 0 },
    FEMALE : { label : "FEMALE", value : 1 },
    
    from: (value: number): typeof UserGender[keyof typeof UserGender] => {
        const entries = Object.entries<{label:string,value:number}>(UserGender);
        for (const [key, val] of entries) {
            if (key !== 'from' && val.value === value) {
                return val;
            }
        }
        throw new Error(`${value}에 해당하는 UserGender를 찾을 수 없습니다.`);
    }
} as const;

export type UserGender = typeof UserGender[keyof typeof UserGender];

/**
 * 사용자 성별 열거형
 */
export const UserRegion = {
    SEOUL : { label : "SEOUL", value : 0 }, // 서울
    GYEONGGI : { label : "GYEONGGI", value : 1 }, // 경기
    INCHEON : { label : "INCHEON", value : 2 }, // 인천
    GANGWON : { label : "GANGWON", value : 3 }, // 강원
    CHUNGCHEONG : { label : "CHUNGCHEONG", value : 4 }, // 충청
    JEOLLA : { label : "JEOLLA", value : 5 }, // 전라
    GYEONGSANG : { label : "GYEONGSANG", value : 6 }, // 경상
    JEJU : { label : "JEJU", value : 7 }, // 제주
    
    // 숫자 값으로부터 해당 enum 반환
    from: (value: number): typeof UserRegion[keyof typeof UserRegion] => {
        const entries = Object.entries<{label:string,value:number}>(UserRegion);
        for (const [key, val] of entries) {
            if (key !== 'from' && val.value === value) {
                return val;
            }
        }
        throw new Error(`${value}에 해당하는 UserRegion을 찾을 수 없습니다.`);
    }
} as const;

export type UserRegion = typeof UserRegion[keyof typeof UserRegion];

/**
 * 사용자 회원 상태 열거형
 */
export const UserStatus = {
    ACTIVE : { label : "ACTIVE", value : 0 }, // 활성화
    INACTIVE : { label : "INACTIVE", value : 1 }, // 비활성화
    SUSPENDED : { label : "SUSPENDED", value : 2 }, // 정지
    DELETED : { label : "DELETED", value : 3 }, // 탈퇴
    
    // 숫자 값으로부터 해당 enum 반환
    from: (value: number): typeof UserStatus[keyof typeof UserStatus] => {
        const entries = Object.entries<{label:string,value:number}>(UserStatus);
        for (const [key, val] of entries) {
            if (key !== 'from' && val.value === value) {
                return val;
            }
        }
        throw new Error(`${value}에 해당하는 UserStatus를 찾을 수 없습니다.`);
    }
} as const;

export type UserStatus = typeof UserStatus[keyof typeof UserStatus];