export abstract class OtpRepositoryPort {
    /**
     * OTP가 이미 존재하는지 확인
     * @param phoneNumber 전화번호
     * @returns 존재하면 true
     */
    abstract exists(phoneNumber: string): Promise<boolean>;

    /**
     * OTP 저장
     * @param phoneNumber 전화번호
     * @param otp 6자리 OTP
     * @param ttlSec TTL (초)
     */
    abstract save(phoneNumber: string, otp: string, ttlSec: number): Promise<void>;

    /**
     * OTP 조회
     * @param phoneNumber 전화번호
     * @returns OTP 코드 또는 null
     */
    abstract get(phoneNumber: string): Promise<string | null>;

    /**
     * OTP 삭제
     * @param phoneNumber 전화번호
     */
    abstract delete(phoneNumber: string): Promise<void>;

    /**
     * OTP 검증 시도 횟수 증가
     * @param phoneNumber 전화번호
     * @returns 남은 시도 횟수
     */
    abstract incrementAttempts(phoneNumber: string): Promise<number>;

    /**
     * OTP 검증 시도 횟수 조회
     * @param phoneNumber 전화번호
     * @returns 시도 횟수
     */
    abstract getAttempts(phoneNumber: string): Promise<number>;
}