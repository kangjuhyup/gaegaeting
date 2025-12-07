import { UserGender, UserRegion } from "@app/user/domain/enum/user.enum";
import { UserProfileEntity } from "@app/user/domain/model/user-profile";
import { UserProfileOrmEntity, UserProfileStatus } from "@core/database";
import { ulid } from "ulid";

/**
 * UserProfileOrmMapper 클래스
 * 
 * UserProfileOrmEntity와 UserProfileEntity 간의 변환을 담당하는 매퍼 클래스입니다.
 */
export class UserProfileOrmMapper {

    /**
     * ORM 엔티티를 도메인 엔티티로 변환합니다.
     * 
     * @param orm UserProfileOrmEntity
     * @returns UserProfileEntity
     */
    static toDomain(orm: UserProfileOrmEntity): UserProfileEntity {
        if (!orm) return null;
        
        return UserProfileEntity.of({
            name: orm.name,
            nickname: orm.nickname,
            gender: UserGender.from(orm.gender),
            birthDate: orm.birthDate,
            region: UserRegion.from(orm.region),
            bio: orm.bio,
            status: orm.status,
        }, orm.id).setPersistence(orm.id, orm.createdAt, orm.updatedAt);
    }

    /**
     * 도메인 엔티티를 ORM 엔티티로 변환합니다.
     * 
     * @param domain UserProfileEntity
     * @returns UserProfileOrmEntity
     */
    static toOrm(domain: UserProfileEntity): UserProfileOrmEntity {
        if (!domain) return null;
        
        const orm = new UserProfileOrmEntity();
        
        // ID 설정
        orm.id = domain.id || ulid();
        // 기본 정보 설정
        orm.name = domain.name;
        orm.nickname = domain.nickname;
        // 개인 정보 설정
        orm.gender = domain.gender.value;
        orm.birthDate = domain.birthDate;
        orm.region = domain.region.value;
        orm.bio = domain.bio;
        // 상태 정보 설정
        orm.status = domain.status;
        // 메타데이터 설정
        orm.createdAt = domain.createdAt;
        orm.updatedAt = domain.updatedAt;
        return orm;
    }
}
