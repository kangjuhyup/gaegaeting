import { UserEntity, UserStatus, UserGender, UserRegion, AuthProvider } from "@app/domain/model/user";
import { UserOrmEntity } from "@core/database/src/entity/user";

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
    static toDomain(userOrmEntity: UserOrmEntity): UserEntity {
        if (!userOrmEntity) return null;
        
        return new UserEntity({
            id: userOrmEntity.id,
            email: userOrmEntity.email,
            password: userOrmEntity.passwordHash,
            nickname: userOrmEntity.nickname,
            profileImageUrl: userOrmEntity.profileImageUrl,
            gender: userOrmEntity.gender as UserGender,
            birthDate: userOrmEntity.birthDate,
            region: userOrmEntity.region as UserRegion,
            bio: userOrmEntity.bio,
            phoneNumber: userOrmEntity.phoneNumber || '',
            authProvider: userOrmEntity.authProvider as AuthProvider,
            authProviderId: userOrmEntity.authProviderId,
            status: userOrmEntity.status as UserStatus,
            lastLoginAt: userOrmEntity.lastLoginAt,
            createdAt: userOrmEntity.createdAt,
            updatedAt: userOrmEntity.updatedAt
        });
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
        userOrm.profileImageUrl = userEntity.profileImageUrl;
        
        // 개인 정보 설정
        userOrm.gender = userEntity.gender;
        userOrm.birthDate = userEntity.birthDate;
        userOrm.region = userEntity.region;
        userOrm.bio = userEntity.bio;
        userOrm.phoneNumber = userEntity.phoneNumber;
        
        // 인증 정보 설정
        userOrm.authProvider = userEntity.authProvider;
        userOrm.authProviderId = userEntity.authProviderId;
        userOrm.status = userEntity.status;
        userOrm.lastLoginAt = userEntity.lastLoginAt;
        
        // 메타데이터 설정
        userOrm.createdAt = userEntity.createdAt;
        userOrm.updatedAt = userEntity.updatedAt;
        
        return userOrm;
    }
}