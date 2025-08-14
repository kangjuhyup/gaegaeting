import { AuthRepositoryPort } from "@app/auth/domain/port/out/auth-repository.port";
import { AuthEntity } from "@app/auth/domain/model/auth";
import { AuthProvider } from "@core/database";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from "typeorm";
import { AuthOrmEntity } from '@core/database';
import { AuthMapper } from "./mapper/auth.mapper";

@Injectable()
export class AuthOrmRepository implements AuthRepositoryPort {
    
    constructor(
        private readonly authMapper : AuthMapper,
        @InjectRepository(AuthOrmEntity) private readonly auth : Repository<AuthOrmEntity>
    ) {}
    
    async saveAuth(auth: AuthEntity): Promise<number> {
        const ormEntity = this.authMapper.toOrmEntity(auth);
        const authEntity = await this.auth.save(ormEntity);
        return authEntity.id;
    }

    async findByUserIdAndProvider(userId: string, provider: AuthProvider, providerId: string): Promise<AuthEntity | null> {
        const ormEntity = await this.auth.findOne({
            where: {
                user: { id: userId },
                authProvider: provider,
                authProviderId: providerId,
            },
            relations: ['user'],
        });
        
        return ormEntity ? this.authMapper.toDomainEntity(ormEntity) : null;
    }
    async findByRefreshToken(refreshToken: string): Promise<AuthEntity | null> {
        const ormEntity = await this.auth.findOne({
            where: {
                refreshToken,
            },
            relations: ['user'],
        });
        
        return ormEntity ? this.authMapper.toDomainEntity(ormEntity) : null;
    }
    async updateAuth(authId: number, auth: AuthEntity): Promise<boolean> {
        await this.auth.update(authId, this.authMapper.toOrmEntity(auth));
        return true;
    }
    
}