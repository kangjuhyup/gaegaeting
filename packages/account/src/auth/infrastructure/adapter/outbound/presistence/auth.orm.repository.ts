import { AuthRepositoryPort } from "@app/auth/domain/port/auth-repository.port";
import { AuthEntity } from "@app/auth/domain/model/auth";
import { Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";
import { AuthOrmEntity, BaseRepository } from '@core/database';
import { AuthMapper } from "./mapper/auth.mapper";
import { UserPrincipal } from "@core/auth";

@Injectable()
export class AuthOrmRepository extends BaseRepository<AuthOrmEntity> implements AuthRepositoryPort {
    
    constructor(
        private readonly authMapper : AuthMapper,
        dataSource: DataSource
    ) {
        super(AuthOrmEntity, dataSource);
    }

    
    async saveAuth(auth: AuthEntity): Promise<AuthEntity> {
        const ormEntity = this.authMapper.toOrmEntity(auth);
        const authEntity = await this.getRepository().save(ormEntity);
        return this.authMapper.toDomainEntity(authEntity);
    }

    async findUserByAuthProvider(providerType: number, providerId: string): Promise<UserPrincipal | null> {
        const ormEntity = await this.getRepository().findOne({
            where: {
                authProvider: providerType,
                authProviderId: providerId,
            },
            relations: ['user'],
        });
        if(ormEntity.user) {
            return {
                userId : ormEntity.user.id,
                name : ormEntity.user.name,
                nickname : ormEntity.user.nickname,
                birth : ormEntity.user.birthDate.toString(),
                region : ormEntity.user.region,
            }
        }
        return null;
    }
    async findByRefreshToken(refreshToken: string): Promise<AuthEntity | null> {
        const ormEntity = await this.getRepository().findOne({
            where: {
                refreshToken,
            },
            relations: ['user'],
        });
        
        return ormEntity ? this.authMapper.toDomainEntity(ormEntity) : null;
    }
    
    async updateUserId(providerType:number,providerId:string, userId: string): Promise<boolean> {
        await this.getRepository().update({ authProvider : providerType, authProviderId : providerId }, { userId });
        return true;
    }    
    
}