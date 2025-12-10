import { PetProfileEntity } from "../../domain/model/pet-profile";

/**
 * 반려동물 첨부파일 리포지토리 포트
 * 
 * 반려동물 첨부파일(프로필 이미지) 관련 데이터 접근을 위한 포트 인터페이스입니다.
 */
export abstract class PetAttachmentRepositoryPort {
  /**
   * 반려동물 첨부파일 생성
   */
  abstract insertPetAttachment(pet: PetProfileEntity): Promise<PetProfileEntity>;
}

