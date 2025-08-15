// AuthProvider 타입 정의
type AuthProviderValue = {
    label: string;
    value: number;
};

// AuthProvider 객체 타입 정의
interface AuthProviderObject {
    KAKAO: AuthProviderValue;
    NAVER: AuthProviderValue;
    GOOGLE: AuthProviderValue;
    APPLE: AuthProviderValue;
    EMAIL: AuthProviderValue;
    from(value: number): AuthProviderValue;
}

// AuthProvider 상수 정의
export const AuthProvider: AuthProviderObject = {
    KAKAO: { label: 'KAKAO', value: 0 },
    NAVER: { label: 'NAVER', value: 1 },
    GOOGLE: { label: 'GOOGLE', value: 2 },
    APPLE: { label: 'APPLE', value: 3 },
    EMAIL: { label: 'EMAIL', value: 4 },

    from(value: number): AuthProviderValue {
        const entries = Object.entries(AuthProvider) as [string, AuthProviderValue][];
        for (const [key, val] of entries) {
            if (key !== 'from' && val.value === value) {
                return val;
            }
        }
        throw new Error(`${value}에 해당하는 AuthProvider를 찾을 수 없습니다.`);
    }
};

// 외부에서 사용할 AuthProvider 타입 정의
export type AuthProvider = AuthProviderValue;
