import { UserAttachmentOrmEntity, BaseRepository } from "@core/database";
import { Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";
import { UserAttachmentRepositoryPort } from "@app/user/infrastructure/port/user-attachment-repository.port";
import { UserAttachmentEntity } from "@app/user/domain/model/user-attachment";
import { UserAttachmentOrmMapper } from "./mapper/user-attachment-orm";

/**
 * 사용자 첨부파일 ORM 리포지토리
 * 
 * UserAttachmentOrmEntity를 사용하여 사용자 첨부파일(프로필 이미지) 데이터를 관리합니다.
 */
@Injectable()
export class UserAttachmentOrmRepository extends BaseRepository<UserAttachmentOrmEntity> implements UserAttachmentRepositoryPort {

    constructor(dataSource: DataSource) {
        super(UserAttachmentOrmEntity, dataSource);
    }

    async selectUserAttachment(userId: string, no: number): Promise<UserAttachmentEntity> {
        const userAttachmentOrm = await this.getRepository().findOne({ where: { userId, no } });
        return UserAttachmentOrmMapper.toDomain(userAttachmentOrm);
    }

    async selectUserAttachments(userId: string): Promise<UserAttachmentEntity[]> {
        const userAttachmentOrms = await this.getRepository().find({ where: { userId } });
        return userAttachmentOrms.map(orm => UserAttachmentOrmMapper.toDomain(orm));
    }

    async insertUserAttachment(userAttachment: UserAttachmentEntity): Promise<UserAttachmentEntity> {
        const userAttachmentOrm = UserAttachmentOrmMapper.toOrm(userAttachment);
        const insertedUserAttachment = await this.getRepository().save(userAttachmentOrm);
        return UserAttachmentOrmMapper.toDomain(insertedUserAttachment);
    }

    async updateUserAttachment(userAttachment: UserAttachmentEntity): Promise<UserAttachmentEntity> {
        // ORM 엔티티를 직접 조회
        const userAttachmentOrm = await this.getRepository().findOne({
            where: { userId: userAttachment.id.userId, no: userAttachment.id.no }
        });

        if (!userAttachmentOrm) {
            throw new Error('User attachment not found');
        }

        // ORM 엔티티의 속성을 직접 변경 (JPA의 더티 체킹과 유사)
        userAttachmentOrm.isActive = userAttachment.active;

        // save()를 호출하면 변경된 필드만 업데이트됩니다
        // 하지만 여전히 SELECT 후 UPDATE를 수행합니다
        const updatedUserAttachment = await this.getRepository().save(userAttachmentOrm);
        return UserAttachmentOrmMapper.toDomain(updatedUserAttachment);
    }

    async updateUserAttachmentActive(userId: string, no: number, active: boolean): Promise<void> {
        await this.getRepository().update({ userId, no }, { isActive: active });
    }

    async deleteUserAttachment(userId: string, no: number): Promise<void> {
        await this.getRepository().delete({ userId, no });
    }
}

