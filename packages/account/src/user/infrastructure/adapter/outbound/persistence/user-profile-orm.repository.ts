import { EntityManager, UserProfileOrmEntity } from "@core/database/mikro";
import { Injectable } from "@nestjs/common";
import { UserProfileOrmMapper } from "./mapper/user-profile-orm.js";
import { UserProfileRepositoryPort } from "#app/user/infrastructure/port/user-profile-repository.port";
import { UserProfileEntity } from "#app/user/domain/model/user-profile";

/**
 * 사용자 프로필 ORM 리포지토리
 * 
 * UserProfileOrmEntity를 사용하여 사용자 프로필 데이터를 관리합니다.
 */
@Injectable()
export class UserProfileOrmRepository implements UserProfileRepositoryPort {

    constructor(private readonly entityManager: EntityManager) {}

    private get repository() {
        return this.entityManager.getRepository(UserProfileOrmEntity);
    }

    async insertUserProfile(user: UserProfileEntity): Promise<UserProfileEntity> {
        const userOrm = UserProfileOrmMapper.toOrm(user);
        this.entityManager.persist(userOrm);
        await this.entityManager.flush();
        return UserProfileOrmMapper.toDomain(userOrm);
    }

    async selectUserProfileFromId(id: string): Promise<UserProfileEntity> {
        const userOrm = await this.repository.findOne({ id });
        return UserProfileOrmMapper.toDomain(userOrm);
    }

    async updateUserProfile(user: UserProfileEntity): Promise<UserProfileEntity> {
        const userOrm = UserProfileOrmMapper.toOrm(user);
        const current = await this.repository.findOneOrFail({ id: userOrm.id });
        this.entityManager.assign(current, userOrm);
        await this.entityManager.flush();
        return UserProfileOrmMapper.toDomain(current);
    }

    async hardDeleteUser(id: string): Promise<void> {
        await this.entityManager.nativeDelete(UserProfileOrmEntity, { id });
    }
}
