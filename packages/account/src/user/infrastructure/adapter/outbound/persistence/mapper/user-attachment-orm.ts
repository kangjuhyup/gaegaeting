import { UserAttachmentEntity } from "@app/user/domain/model/user-attachment";
import { UserAttachmentOrmEntity } from "@core/database";

/**
 * UserAttachmentOrmMapper 클래스
 * 
 * UserAttachmentOrmEntity와 UserAttachmentEntity 간의 변환을 담당하는 매퍼 클래스입니다.
 */
export class UserAttachmentOrmMapper {

    /**
     * ORM 엔티티를 도메인 엔티티로 변환합니다.
     * 
     * @param orm UserAttachmentOrmEntity
     * @returns UserAttachmentEntity
     */
    static toDomain(orm: UserAttachmentOrmEntity): UserAttachmentEntity {
        if (!orm) return null;
        
        return UserAttachmentEntity.of({
            path: orm.path,
            active: orm.isActive
        }, {
            userId: orm.userId,
            no: orm.no
        }).setPersistence({ userId: orm.userId, no: orm.no }, orm.createdAt, orm.updatedAt);
    }

    /**
     * 도메인 엔티티를 ORM 엔티티로 변환합니다.
     * 
     * @param domain UserAttachmentEntity
     * @returns UserAttachmentOrmEntity
     */
    static toOrm(domain: UserAttachmentEntity): UserAttachmentOrmEntity {
        if (!domain) return null;
        
        const orm = new UserAttachmentOrmEntity();
        orm.userId = domain.id.userId;
        orm.no = domain.id.no;
        orm.path = domain.path;
        orm.isActive = domain.active;
        orm.createdAt = domain.createdAt;
        orm.updatedAt = domain.updatedAt;
        return orm;
    }
}

