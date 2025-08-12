/**
 * 인증 제공자 열거형
 * 
 * 지원하는 소셜 로그인 제공자 목록입니다.
 */
export const AuthProvider = {
    KAKAO: 'kakao',
    NAVER: 'naver',
    GOOGLE: 'google',
    APPLE: 'apple',
    EMAIL: 'email',
} as const;

export type AuthProvider = typeof AuthProvider[keyof typeof AuthProvider];

const authProviderSet = new Set<string>(Object.values(AuthProvider));

export const toAuthProvider = (provider: string): AuthProvider => {
    if (authProviderSet.has(provider)) {
        return provider as AuthProvider;
    }
    throw new Error(`Invalid AuthProvider: ${provider}`);
}