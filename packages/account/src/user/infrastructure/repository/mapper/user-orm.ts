import { UserGender, UserRegion, UserStatus } from "@app/user/domain/enum/user.enum";
import { UserEntity } from "@app/user/domain/model/user";
import { UserOrmEntity } from "@core/database";

/**
 * UserOrmMapper 클래스
 * 
 * ORM 엔티티와 도메인 엔티티 간의 변환을 담당하는 매퍼 클래스입니다.
 */
export class UserOrmMapper {

    /**
     * ORM 엔티티를 도메인 엔티티로 변환합니다.
     * 
     * @param userOrmEntity TypeORM 엔티티
     * @returns 도메인 엔티티
     */
    static toDomain(orm: UserOrmEntity): UserEntity {
        if (!orm) return null;
        
        return UserEntity.of({
            nickname: orm.nickname,
            gender: UserGender.from(orm.gender),
            birthDate: orm.birthDate,
            region: UserRegion.from(orm.region),
            phoneNumber: orm.phoneNumber,
            status: UserStatus.from(orm.status),
        }).setPersistence(orm.id,orm.createdAt,orm.updatedAt);
    }

    /**
     * 도메인 엔티티를 ORM 엔티티로 변환합니다.
     * 
     * @param userEntity 도메인 엔티티
     * @returns TypeORM 엔티티
     */
    static toOrm(userEntity: UserEntity): UserOrmEntity {
        if (!userEntity) return null;
        
        const userOrm = new UserOrmEntity();
        
        // ID 설정
        userOrm.id = userEntity.id;
        
        // 기본 정보 설정
        userOrm.email = userEntity.email;
        userOrm.passwordHash = userEntity.passwordHash;
        userOrm.nickname = userEntity.nickname;
        
        // 개인 정보 설정
        userOrm.gender = userEntity.gender;
        userOrm.birthDate = userEntity.birthDate;
        userOrm.region = userEntity.region;
        userOrm.bio = userEntity.bio;
        userOrm.phoneNumber = userEntity.phoneNumber;
        
        // 인증 정보 설정
        userOrm.status = userEntity.status;
        
        // 메타데이터 설정
        userOrm.createdAt = userEntity.createdAt;
        userOrm.updatedAt = userEntity.updatedAt;
        
        return userOrm;
    }
}