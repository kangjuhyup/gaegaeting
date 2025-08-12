import { AuthRepositoryPort } from "@app/auth/domain/port/out/auth-repository.port";
import { AuthEntity } from "@app/auth/domain/model/auth";
import { AuthProvider } from "@app/auth/domain/model/type/auth-provider.type";
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
    
    async saveAuth(userId: string, auth: AuthEntity): Promise<string> {
        const ormEntity = this.authMapper.toOrmEntity(auth);
        ormEntity.user.id = userId;
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
    async updateAuth(authId: string, auth: AuthEntity): Promise<boolean> {
        await this.auth.update(authId, auth);
        return true;
    }
    
}