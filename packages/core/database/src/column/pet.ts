import { Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

/**
 * 강아지 성별 열거형
 */
export enum PetGender {
  MALE = 'MALE',         // 수컷
  FEMALE = 'FEMALE',     // 암컷
}

/**
 * 강아지 크기 열거형
 */
export enum PetSize {
  SMALL = 'SMALL',       // 소형견 (10kg 미만)
  MEDIUM = 'MEDIUM',     // 중형견 (10kg~25kg)
  LARGE = 'LARGE',       // 대형견 (25kg 이상)
}

/**
 * 강아지 품종 열거형
 */
export enum PetBreed {
  MALTESE = 'MALTESE',                 // 말티즈
  POODLE = 'POODLE',                   // 푸들
  CHIHUAHUA = 'CHIHUAHUA',             // 치와와
  POMERANIAN = 'POMERANIAN',           // 포메라니안
  SHIH_TZU = 'SHIH_TZU',               // 시츄
  YORKSHIRE_TERRIER = 'YORKSHIRE_TERRIER', // 요크셔 테리어
  BEAGLE = 'BEAGLE',                   // 비글
  GOLDEN_RETRIEVER = 'GOLDEN_RETRIEVER', // 골든 리트리버
  LABRADOR_RETRIEVER = 'LABRADOR_RETRIEVER', // 래브라도 리트리버
  BORDER_COLLIE = 'BORDER_COLLIE',     // 보더 콜리
  SAMOYED = 'SAMOYED',                 // 사모예드
  HUSKY = 'HUSKY',                     // 허스키
  GERMAN_SHEPHERD = 'GERMAN_SHEPHERD', // 저먼 셰퍼드
  JINDO = 'JINDO',                     // 진돗개
  MIXED = 'MIXED',                     // 믹스견
  OTHER = 'OTHER',                     // 기타
}

/**
 * 강아지 성격 특성 열거형
 */
export enum PetPersonality {
  FRIENDLY = 'FRIENDLY',               // 친근함
  ACTIVE = 'ACTIVE',                   // 활발함
  CALM = 'CALM',                       // 차분함
  PLAYFUL = 'PLAYFUL',                 // 장난기 많음
  SHY = 'SHY',                         // 수줍음
  INDEPENDENT = 'INDEPENDENT',         // 독립적
  SOCIAL = 'SOCIAL',                   // 사교적
  PROTECTIVE = 'PROTECTIVE',           // 보호적
  CURIOUS = 'CURIOUS',                 // 호기심 많음
  INTELLIGENT = 'INTELLIGENT',         // 영리함
}

/**
 * 강아지 ID 컴포넌트
 */
export class PetIdColumn {
  /**
   * 강아지 ID
   */
  @Column({ primary: true, type: 'varchar', length: 26, name: 'id' })
  id: string;
}

/**
 * 강아지 기본 정보 컴포넌트
 */
export class PetBasicInfoColumn {
  /**
   * 강아지 이름
   */
  @Column({ type: 'varchar', length: 50, name: 'name' })
  name: string;

  /**
   * 강아지 나이 (년)
   */
  @Column({ type: 'int', name: 'age' })
  age: number;

  /**
   * 강아지 성별
   */
  @Column({ type: 'enum', enum: PetGender, name: 'gender' })
  gender: PetGender;

  /**
   * 강아지 품종
   */
  @Column({ type: 'enum', enum: PetBreed, default: PetBreed.OTHER, name: 'breed' })
  breed: PetBreed;

  /**
   * 강아지 크기
   */
  @Column({ type: 'enum', enum: PetSize, name: 'size' })
  size: PetSize;
}

/**
 * 강아지 추가 정보 컴포넌트
 */
export class PetAdditionalInfoColumn {
  /**
   * 강아지 성격 특성 (JSON 배열로 저장)
   */
  @Column({ type: 'simple-array', name: 'personalities' })
  personalities: PetPersonality[];

  /**
   * 강아지 이미지 URL 목록 (JSON 배열로 저장)
   */
  @Column({ type: 'simple-array', nullable: true, name: 'image_urls' })
  imageUrls: string[] | null;

  /**
   * 강아지 설명
   */
  @Column({ type: 'text', nullable: true, name: 'description' })
  description: string | null;
}

/**
 * 강아지 소유자 정보 컴포넌트
 */
export class PetOwnerInfoColumn {
  /**
   * 소유자 사용자 ID
   */
  @Column({ type: 'varchar', length: 26, name: 'owner_id' })
  ownerId: string;
}

/**
 * 강아지 메타데이터 컴포넌트
 */
export class PetMetadataColumn {
  /**
   * 생성 시간
   */
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  /**
   * 수정 시간
   */
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
