import { OtpRepositoryPort } from "@app/auth/domain/port/otp-repository.port";
import { CacheService } from "@core/redis";
import { Injectable } from "@nestjs/common";

@Injectable()
export class OtpRedisRepository implements OtpRepositoryPort {
    
    constructor(
        private readonly cache : CacheService 
    ) {}
    
    exists(phoneNumber: string): Promise<boolean> {
        throw new Error("Method not implemented.");
    }
    save(phoneNumber: string, otp: string, ttlSec: number): Promise<void> {
        throw new Error("Method not implemented.");
    }
    get(phoneNumber: string): Promise<string | null> {
        throw new Error("Method not implemented.");
    }
    delete(phoneNumber: string): Promise<void> {
        throw new Error("Method not implemented.");
    }
    incrementAttempts(phoneNumber: string): Promise<number> {
        throw new Error("Method not implemented.");
    }
    getAttempts(phoneNumber: string): Promise<number> {
        throw new Error("Method not implemented.");
    }

}