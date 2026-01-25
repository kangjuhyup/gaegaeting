import { PetProfileEntity } from "../../domain/model/pet-profile";

/**
 * 반려동물 프로필 리포지토리 포트
 * 
 * 반려동물 프로필 관련 데이터 접근을 위한 포트 인터페이스입니다.
 */
export abstract class PetProfileRepositoryPort {
  /**
   * 반려동물 프로필 생성
   */
  abstract insertPet(pet: PetProfileEntity): Promise<PetProfileEntity>;
  
  /**
   * ID로 반려동물 프로필 조회
   */
  abstract selectPetFromId(id: number): Promise<PetProfileEntity>;
  
  /**
   * 사용자 ID로 반려동물 프로필 목록 조회
   */
  abstract selectPetFromUserId(userId: string): Promise<PetProfileEntity[]>;
  
  /**
   * 반려동물 프로필 업데이트
   */
  abstract updatePet(pet: PetProfileEntity): Promise<PetProfileEntity>;
  
  /**
   * 반려동물 프로필 삭제
   */
  abstract deletePet(id: number): Promise<void>;
}

