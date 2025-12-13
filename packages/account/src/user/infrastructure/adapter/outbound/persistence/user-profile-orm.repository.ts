import { UserProfileOrmEntity, BaseRepository } from "@core/database";
import { Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";
import { UserProfileOrmMapper } from "./mapper/user-profile-orm";
import { UserProfileRepositoryPort } from "@app/user/infrastructure/port/user-profile-repository.port";
import { UserProfileEntity } from "@app/user/domain/model/user-profile";

/**
 * 사용자 프로필 ORM 리포지토리
 * 
 * UserProfileOrmEntity를 사용하여 사용자 프로필 데이터를 관리합니다.
 */
@Injectable()
export class UserProfileOrmRepository extends BaseRepository<UserProfileOrmEntity> implements UserProfileRepositoryPort {

    constructor(dataSource: DataSource) {
        super(UserProfileOrmEntity, dataSource);
    }

    async insertUserProfile(user: UserProfileEntity): Promise<UserProfileEntity> {
        const userOrm = UserProfileOrmMapper.toOrm(user);
        const insertedUser = await this.getRepository().save(userOrm);
        return UserProfileOrmMapper.toDomain(insertedUser);
    }

    async selectUserProfileFromId(id: string): Promise<UserProfileEntity> {
        const userOrm = await this.getRepository().findOneBy({ id });
        return UserProfileOrmMapper.toDomain(userOrm);
    }

    async updateUserProfile(user: UserProfileEntity): Promise<UserProfileEntity> {
        const userOrm = UserProfileOrmMapper.toOrm(user);
        const updatedUser = await this.getRepository().save(userOrm);
        return UserProfileOrmMapper.toDomain(updatedUser);
    }

    async hardDeleteUser(id: string): Promise<void> {
        await this.getRepository().delete(id);
    }
}

