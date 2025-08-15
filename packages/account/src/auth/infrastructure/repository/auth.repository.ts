import { AuthRepositoryPort } from "@app/auth/domain/port/out/auth-repository.port";
import { AuthEntity } from "@app/auth/domain/model/auth";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from "typeorm";
import { AuthOrmEntity } from '@core/database';
import { AuthMapper } from "./mapper/auth.mapper";
import { AuthProvider, UserPrincipal } from "@core/auth";
import { UserRegion } from '../../../user/domain/enum/user.enum';

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

    async findUserByAuthProvider(provider: AuthProvider, providerId: string): Promise<UserPrincipal | null> {
        const ormEntity = await this.auth.findOne({
            where: {
                authProvider: provider.value,
                authProviderId: providerId,
            },
            relations: ['user'],
        });
        if(ormEntity.user) {
            return {
                userId : ormEntity.user.id,
                nickname : ormEntity.user.nickname,
                birth : ormEntity.user.birthDate.getDate().toString(),
                region : UserRegion.from(ormEntity.user.region),
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
    async updateAuth(authId: number, auth: AuthEntity): Promise<boolean> {
        await this.auth.update(authId, this.authMapper.toOrmEntity(auth));
        return true;
    }
    
}