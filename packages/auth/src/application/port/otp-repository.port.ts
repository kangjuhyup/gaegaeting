export abstract class OtpRepositoryPort {
  abstract saveCode(phoneNumber: string, code: string, ttlSeconds: number): Promise<void>;
  abstract verifyAndConsume(phoneNumber: string, code: string): Promise<boolean>;
  abstract hasActiveCode(phoneNumber: string): Promise<boolean>;
}


