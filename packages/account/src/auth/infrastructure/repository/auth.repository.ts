import { AuthRepositoryPort } from "@app/auth/domain/port/out/auth-repository.port";
import { AuthEntity } from "@app/auth/domain/model/auth";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from "typeorm";
import { AuthOrmEntity } from '@core/database';
import { AuthMapper } from "./mapper/auth.mapper";
import { UserPrincipal } from "@core/auth";

@Injectable()
export class AuthOrmRepository implements AuthRepositoryPort {
    
    constructor(
        private readonly authMapper : AuthMapper,
        @InjectRepository(AuthOrmEntity) private readonly auth : Repository<AuthOrmEntity>
    ) {}

    
    async saveAuth(auth: AuthEntity): Promise<AuthEntity> {
        const ormEntity = this.authMapper.toOrmEntity(auth);
        const authEntity = await this.auth.save(ormEntity);
        return this.authMapper.toDomainEntity(authEntity);
    }

    async findUserByAuthProvider(providerType: number, providerId: string): Promise<UserPrincipal | null> {
        const ormEntity = await this.auth.findOne({
            where: {
                authProvider: providerType,
                authProviderId: providerId,
            },
            relations: ['user'],
        });
        if(ormEntity.user) {
            return {
                userId : ormEntity.user.id,
                nickname : ormEntity.user.nickname,
                birth : ormEntity.user.birthDate.toString(),
                region : ormEntity.user.region,
            }
        }
        return null;
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
    
    async updateUserId(providerType:number,providerId:string, userId: string): Promise<boolean> {
        const result = await this.auth.update({ authProvider : providerType, authProviderId : providerId }, { userId }).catch(console.log);
        return true;
    }    
    
}