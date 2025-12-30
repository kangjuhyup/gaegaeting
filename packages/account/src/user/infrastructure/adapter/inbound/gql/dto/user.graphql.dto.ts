import { UserProfileEntity, IUserProfile } from '@app/user/domain/model/user-profile';
import { UserGender, UserRegion } from '@app/user/domain/enum/user.enum';
import { UserProfileStatus } from '@core/database';
import {  CreateUserProfileInput, UpdateUserProfileInput, PresignedUrl as GraphQLPresignedUrl } from '../graphql';
import { PresignedUrl } from '@app/common/vo/presigned-url';
import { UserAttachmentEntity } from '@app/user/domain/model/user-attachment';

/**
 * GraphQL User DTO
 * 도메인 엔티티를 GraphQL 타입으로 변환
 */
export class UserGraphQLDto {
  /**
   * 도메인 엔티티를 GraphQL User 타입으로 변환
   * 
   * @param user 사용자 프로필 엔티티
   * @param profileImages 프로필 이미지 엔티티 배열 (선택적)
   */
  static fromDomain(user: UserProfileEntity, profileImages?: UserAttachmentEntity[]): any {
    console.log(user)
    return {
      id: user.id,
      name: user.name,
      nickname: user.nickname,
      gender: this.toGraphQLGender(user.gender),
      birthDate: user.birthDate,
      region: this.toGraphQLRegion(user.region),
      bio: user.bio,
      phoneNumber: user.phoneNumber,
      status: this.toGraphQLStatus(user.status),
      profileImages: (profileImages || []).filter((p) => p.active).map((p) => p.path),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * GraphQL CreateUserProfileInput을 도메인 엔티티 데이터로 변환
   */
  static toDomainEntity(input: CreateUserProfileInput): IUserProfile {
    return {
      name: input.name,
      nickname: input.nickname,
      gender: this.toDomainGender(input.gender),
      birthDate: input.birthDate,
      region: this.toDomainRegion(input.region),
      bio: input.bio,
      status: UserProfileStatus.ACTIVE, // 기본값은 ACTIVE
    };
  }

  /**
   * GraphQL UpdateUserProfileInput을 도메인 업데이트 데이터로 변환
   */
  static toUpdateData(input: UpdateUserProfileInput): {
    nickname?: string;
    region?: UserRegion;
    bio?: string;
  } {
    const updateData: {
      nickname?: string;
      region?: UserRegion;
      bio?: string;
    } = {};

    if (input.nickname !== undefined) {
      updateData.nickname = input.nickname;
    }
    if (input.region !== undefined) {
      updateData.region = this.toDomainRegion(input.region);
    }
    if (input.bio !== undefined) {
      updateData.bio = input.bio;
    }

    return updateData;
  }

  /**
   * PresignedUrl VO를 GraphQL PresignedUrl 타입으로 변환
   */
  static fromPresignedUrl(presignedUrl: PresignedUrl): GraphQLPresignedUrl {
    return {
      url: presignedUrl.url,
      expiresIn: presignedUrl.expiresIn,
    };
  }

  // Enum 변환 메서드들
  private static toGraphQLGender(gender: UserGender): any['gender'] {
    return gender.label as any['gender'];
  }

  private static toDomainGender(gender: 'MALE' | 'FEMALE'): UserGender {
    return gender === 'MALE' ? UserGender.MALE : UserGender.FEMALE;
  }

  private static toGraphQLRegion(region: UserRegion): any['region'] {
    return region.label as any['region'];
  }

  private static toDomainRegion(region: any['region']): UserRegion {
    const regionMap: Record<any['region'], UserRegion> = {
      SEOUL: UserRegion.SEOUL,
      GYEONGGI: UserRegion.GYEONGGI,
      INCHEON: UserRegion.INCHEON,
      GANGWON: UserRegion.GANGWON,
      CHUNGCHEONG: UserRegion.CHUNGCHEONG,
      JEOLLA: UserRegion.JEOLLA,
      GYEONGSANG: UserRegion.GYEONGSANG,
      JEJU: UserRegion.JEJU,
    };
    return regionMap[region];
  }

  private static toGraphQLStatus(status: UserProfileStatus): any['status'] {
    console.log(status)
    return status.label as any['status'];
  }
}

