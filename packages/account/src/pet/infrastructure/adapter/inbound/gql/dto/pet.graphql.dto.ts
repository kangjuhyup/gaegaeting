import { PetProfileEntity } from "@app/pet/domain/model/pet-profile";
import { PetBreed, PetGender, PetPersonality, PetSize } from "@app/pet/domain/enum/pet.enum";
import { PresignedUrl } from "@app/common/vo/presigned-url";
import { PresignedUrl as PresignedUrlGql } from '@app/common/graphql/dto/presigned-url.type';
import { CreatePetInput, UpdatePetInput } from './pet.input';
import { Pet } from './pet.type';
import { PetBreedGql, PetGenderGql, PetPersonalityGql, PetSizeGql } from './pet.enum';

/**
 * GraphQL Pet DTO
 * 도메인 엔티티를 GraphQL 타입으로 변환
 */
export class PetGraphQLDto {
  /**
   * 도메인 엔티티를 GraphQL Pet 타입으로 변환
   * 
   * @param pet 반려동물 엔티티
   * @param profileImages 프로필 이미지 경로 배열 (선택적)
   */
  static fromDomain(pet: PetProfileEntity, profileImages?: string[]): Pet {
    return {
      id: pet.id,
      name: pet.name,
      age: pet.age,
      gender: this.toGraphQLGender(pet.gender),
      breed: this.toGraphQLBreed(pet.breed),
      size: this.toGraphQLSize(pet.size),
      personalities: pet.personalities.map(p => this.toGraphQLPersonality(p)),
      description: pet.description,
      userId: pet.userId,
      isCertificated: pet.isCertificated,
      profileImages: profileImages || (pet.profile ? pet.profile.filter(p => p.isActive).map(p => p.path) : []),
      createdAt: pet.createdAt,
      updatedAt: pet.updatedAt,
    };
  }

  /**
   * GraphQL CreatePetInput을 도메인 엔티티 데이터로 변환
   */
  static toDomainEntity(input: CreatePetInput, userId: string): {
    name: string;
    age: number;
    gender: PetGender;
    breed: PetBreed;
    size: PetSize;
    personalities: PetPersonality[];
    description: string;
    userId: string;
    certification: boolean;
  } {
    return {
      name: input.name,
      age: input.age,
      gender: this.toDomainGender(input.gender),
      breed: this.toDomainBreed(input.breed),
      size: this.toDomainSize(input.size),
      personalities: input.personalities.map(p => this.toDomainPersonality(p)),
      description: input.description || '',
      userId: userId,
      certification: false,
    };
  }

  /**
   * GraphQL UpdatePetInput을 도메인 업데이트 데이터로 변환
   */
  static toUpdateData(input: UpdatePetInput): {
    name?: string;
    age?: number;
    personalities?: PetPersonality[];
    description?: string;
  } {
    const updateData: {
      name?: string;
      age?: number;
      personalities?: PetPersonality[];
      description?: string;
    } = {};

    if (input.name !== undefined) {
      updateData.name = input.name;
    }
    if (input.age !== undefined) {
      updateData.age = input.age;
    }
    if (input.personalities !== undefined) {
      updateData.personalities = input.personalities.map(p => this.toDomainPersonality(p));
    }
    if (input.description !== undefined) {
      updateData.description = input.description;
    }

    return updateData;
  }

  /**
   * PresignedUrl VO를 GraphQL PresignedUrl 타입으로 변환
   */
  static fromPresignedUrl(presignedUrl: PresignedUrl): PresignedUrlGql {
    return {
      url: presignedUrl.url,
      expiresIn: presignedUrl.expiresIn,
    };
  }

  // Enum 변환 메서드들
  private static toGraphQLGender(gender: PetGender): PetGenderGql {
    return gender.label as PetGenderGql;
  }

  private static toDomainGender(gender: PetGenderGql): PetGender {
    return gender === PetGenderGql.MALE ? PetGender.MALE : PetGender.FEMALE;
  }

  private static toGraphQLSize(size: PetSize): PetSizeGql {
    return size.label as PetSizeGql;
  }

  private static toDomainSize(size: PetSizeGql): PetSize {
    const sizeMap: Record<PetSizeGql, PetSize> = {
      SMALL: PetSize.SMALL,
      MEDIUM: PetSize.MEDIUM,
      LARGE: PetSize.LARGE,
    };
    return sizeMap[size];
  }

  private static toGraphQLBreed(breed: PetBreed): PetBreedGql {
    return breed.label as PetBreedGql;
  }

  private static toDomainBreed(breed: PetBreedGql): PetBreed {
    const breedMap: Record<PetBreedGql, PetBreed> = {
      MALTESE: PetBreed.MALTESE,
      POODLE: PetBreed.POODLE,
      CHIHUAHUA: PetBreed.CHIHUAHUA,
      POMERANIAN: PetBreed.POMERANIAN,
      SHIH_TZU: PetBreed.SHIH_TZU,
      YORKSHIRE: PetBreed.YORKSHIRE,
      BEAGLE: PetBreed.BEAGLE,
      GOLDEN_RETRIEVER: PetBreed.GOLDEN_RETRIEVER,
      LABRADOR: PetBreed.LABRADOR,
      HUSKY: PetBreed.HUSKY,
      SAMOYED: PetBreed.SAMOYED,
      WELSH_CORGI: PetBreed.WELSH_CORGI,
      JINDO: PetBreed.JINDO,
      MIXED: PetBreed.MIXED,
      OTHER: PetBreed.OTHER,
    };
    return breedMap[breed];
  }

  private static toGraphQLPersonality(personality: PetPersonality): PetPersonalityGql {
    return personality.label as PetPersonalityGql;
  }

  private static toDomainPersonality(personality: PetPersonalityGql): PetPersonality {
    const personalityMap: Record<PetPersonalityGql, PetPersonality> = {
      FRIENDLY: PetPersonality.FRIENDLY,
      SHY: PetPersonality.SHY,
      ACTIVE: PetPersonality.ACTIVE,
      CALM: PetPersonality.CALM,
      PLAYFUL: PetPersonality.PLAYFUL,
      PROTECTIVE: PetPersonality.PROTECTIVE,
      CURIOUS: PetPersonality.CURIOUS,
      INDEPENDENT: PetPersonality.INDEPENDENT,
    };
    return personalityMap[personality];
  }
}

