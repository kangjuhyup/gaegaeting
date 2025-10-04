import { OtpRepositoryPort } from "@app/auth/domain/port/otp-repository.port";
import { CacheService } from "@core/redis";
import { Injectable } from "@nestjs/common";

@Injectable()
export class OtpRedisRepository implements OtpRepositoryPort {
    
    constructor(
        private readonly cache : CacheService 
    ) {}
    
    exists(key: string): Promise<boolean> {
        throw new Error("Method not implemented.");
    }
    save(key : string, param: any , ttlSec: number): Promise<void> {
        throw new Error("Method not implemented.");
    }
    get(key: string): Promise<string | null> {
        throw new Error("Method not implemented.");
    }
    delete(key: string): Promise<void> {
        throw new Error("Method not implemented.");
    }
    incrementAttempts(key: string): Promise<number> {
        throw new Error("Method not implemented.");
    }
    getAttempts(key: string): Promise<number> {
        throw new Error("Method not implemented.");
    }

}