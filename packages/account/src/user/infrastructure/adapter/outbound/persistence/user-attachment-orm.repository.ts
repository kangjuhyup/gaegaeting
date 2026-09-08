import { EntityManager, UserAttachmentOrmEntity } from "@core/database/mikro";
import { Injectable } from "@nestjs/common";
import { UserAttachmentRepositoryPort } from "#app/user/infrastructure/port/user-attachment-repository.port";
import { UserAttachmentEntity } from "#app/user/domain/model/user-attachment";
import { UserAttachmentOrmMapper } from "./mapper/user-attachment-orm.js";

/**
 * 사용자 첨부파일 ORM 리포지토리
 * 
 * UserAttachmentOrmEntity를 사용하여 사용자 첨부파일(프로필 이미지) 데이터를 관리합니다.
 */
@Injectable()
export class UserAttachmentOrmRepository implements UserAttachmentRepositoryPort {

    constructor(private readonly entityManager: EntityManager) {}

    private get repository() {
        return this.entityManager.getRepository(UserAttachmentOrmEntity);
    }

    async selectUserAttachment(userId: string, no: number): Promise<UserAttachmentEntity> {
        const userAttachmentOrm = await this.repository.findOne({ user: userId, no });
        return UserAttachmentOrmMapper.toDomain(userAttachmentOrm);
    }

    async selectUserAttachments(userId: string): Promise<UserAttachmentEntity[]> {
        const userAttachmentOrms = await this.repository.find({ user: userId });
        return userAttachmentOrms.map(orm => UserAttachmentOrmMapper.toDomain(orm));
    }

    async insertUserAttachment(userAttachment: UserAttachmentEntity): Promise<UserAttachmentEntity> {
        const userAttachmentOrm = UserAttachmentOrmMapper.toOrm(userAttachment);
        this.entityManager.persist(userAttachmentOrm);
        await this.entityManager.flush();
        return UserAttachmentOrmMapper.toDomain(userAttachmentOrm);
    }

    async updateUserAttachment(userAttachment: UserAttachmentEntity): Promise<UserAttachmentEntity> {
        // ORM 엔티티를 직접 조회
        const userAttachmentOrm = await this.repository.findOne({
            user: userAttachment.id.userId, no: userAttachment.id.no
        });

        if (!userAttachmentOrm) {
            throw new Error('User attachment not found');
        }

        // ORM 엔티티의 속성을 직접 변경 (JPA의 더티 체킹과 유사)
        userAttachmentOrm.isActive = userAttachment.active;

        await this.entityManager.flush();
        return UserAttachmentOrmMapper.toDomain(userAttachmentOrm);
    }

    async updateUserAttachmentActive(userId: string, no: number, active: boolean): Promise<void> {
        await this.entityManager.nativeUpdate(UserAttachmentOrmEntity, { user: userId, no }, { isActive: active });
    }

    async deleteUserAttachment(userId: string, no: number): Promise<void> {
        await this.entityManager.nativeDelete(UserAttachmentOrmEntity, { user: userId, no });
    }
}
