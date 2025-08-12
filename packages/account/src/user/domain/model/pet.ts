import { ulid } from 'ulid';

/**
 * 강아지 성별 열거형
 */
export enum PetGender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
}

/**
 * 강아지 크기 열거형
 */
export enum PetSize {
  SMALL = 'SMALL',     // 소형견 (10kg 미만)
  MEDIUM = 'MEDIUM',   // 중형견 (10kg ~ 25kg)
  LARGE = 'LARGE',     // 대형견 (25kg 이상)
}

/**
 * 강아지 품종 열거형
 */
export enum PetBreed {
  MALTESE = 'MALTESE',           // 말티즈
  POODLE = 'POODLE',             // 푸들
  CHIHUAHUA = 'CHIHUAHUA',       // 치와와
  POMERANIAN = 'POMERANIAN',     // 포메라니안
  SHIH_TZU = 'SHIH_TZU',         // 시츄
  YORKSHIRE = 'YORKSHIRE',       // 요크셔테리어
  BEAGLE = 'BEAGLE',             // 비글
  GOLDEN_RETRIEVER = 'GOLDEN_RETRIEVER', // 골든 리트리버
  LABRADOR = 'LABRADOR',         // 래브라도 리트리버
  HUSKY = 'HUSKY',               // 허스키
  SAMOYED = 'SAMOYED',           // 사모예드
  WELSH_CORGI = 'WELSH_CORGI',   // 웰시 코기
  JINDO = 'JINDO',               // 진돗개
  MIXED = 'MIXED',               // 믹스견
  OTHER = 'OTHER',               // 기타
}

/**
 * 강아지 성격 특성 열거형
 */
export enum PetPersonality {
  FRIENDLY = 'FRIENDLY',         // 친근한
  SHY = 'SHY',                   // 수줍음
  ACTIVE = 'ACTIVE',             // 활발한
  CALM = 'CALM',                 // 차분한
  PLAYFUL = 'PLAYFUL',           // 장난기 많은
  PROTECTIVE = 'PROTECTIVE',     // 보호적인
  CURIOUS = 'CURIOUS',           // 호기심 많은
  INDEPENDENT = 'INDEPENDENT',   // 독립적인
}

/**
 * 강아지 도메인 엔티티
 */
export class PetEntity {
  private readonly _id: string;
  private _name: string;
  private _age: number;
  private _gender: PetGender;
  private _breed: PetBreed;
  private _size: PetSize;
  private _personalities: PetPersonality[];
  private _imageUrls: string[];
  private _description: string;
  private _userId: string;
  private _createdAt: Date;
  private _updatedAt: Date;

  /**
   * 강아지 엔티티 생성자
   * 
   * @param id 강아지 ID (없으면 자동 생성)
   * @param name 강아지 이름
   * @param age 강아지 나이
   * @param gender 강아지 성별
   * @param breed 강아지 품종
   * @param size 강아지 크기
   * @param personalities 강아지 성격 특성 배열
   * @param imageUrls 강아지 이미지 URL 배열
   * @param description 강아지 설명
   * @param userId 소유자 사용자 ID
   * @param createdAt 생성 시간 (없으면 현재 시간)
   * @param updatedAt 수정 시간 (없으면 현재 시간)
   */
  constructor(
    id: string | null = null,
    name: string,
    age: number,
    gender: PetGender,
    breed: PetBreed,
    size: PetSize,
    personalities: PetPersonality[] = [],
    imageUrls: string[] = [],
    description: string = '',
    userId: string,
    createdAt: Date | null = null,
    updatedAt: Date | null = null,
  ) {
    this._id = id || ulid();
    this._name = name;
    this._age = age;
    this._gender = gender;
    this._breed = breed;
    this._size = size;
    this._personalities = personalities;
    this._imageUrls = imageUrls;
    this._description = description;
    this._userId = userId;
    this._createdAt = createdAt || new Date();
    this._updatedAt = updatedAt || new Date();

    this.validate();
  }

  /**
   * 강아지 엔티티 유효성 검증
   */
  private validate(): void {
    if (!this._name || this._name.trim().length === 0) {
      throw new Error('강아지 이름은 필수입니다.');
    }

    if (this._age < 0) {
      throw new Error('강아지 나이는 0세 이상이어야 합니다.');
    }

    if (this._personalities.length > 5) {
      throw new Error('강아지 성격 특성은 최대 5개까지 선택 가능합니다.');
    }
  }

  /**
   * 강아지 정보 업데이트
   * 
   * @param name 강아지 이름
   * @param age 강아지 나이
   * @param breed 강아지 품종
   * @param size 강아지 크기
   * @param personalities 강아지 성격 특성 배열
   * @param description 강아지 설명
   */
  updateInfo(
    name?: string,
    age?: number,
    breed?: PetBreed,
    size?: PetSize,
    personalities?: PetPersonality[],
    description?: string,
  ): void {
    if (name !== undefined) this._name = name;
    if (age !== undefined) this._age = age;
    if (breed !== undefined) this._breed = breed;
    if (size !== undefined) this._size = size;
    if (personalities !== undefined) this._personalities = personalities;
    if (description !== undefined) this._description = description;
    
    this._updatedAt = new Date();
    this.validate();
  }

  /**
   * 강아지 이미지 추가
   * 
   * @param imageUrl 이미지 URL
   */
  addImage(imageUrl: string): void {
    if (this._imageUrls.length >= 5) {
      throw new Error('강아지 이미지는 최대 5개까지 등록 가능합니다.');
    }
    
    this._imageUrls.push(imageUrl);
    this._updatedAt = new Date();
  }

  /**
   * 강아지 이미지 제거
   * 
   * @param imageUrl 제거할 이미지 URL
   */
  removeImage(imageUrl: string): void {
    this._imageUrls = this._imageUrls.filter(url => url !== imageUrl);
    this._updatedAt = new Date();
  }

  // Getters
  get id(): string { return this._id; }
  get name(): string { return this._name; }
  get age(): number { return this._age; }
  get gender(): PetGender { return this._gender; }
  get breed(): PetBreed { return this._breed; }
  get size(): PetSize { return this._size; }
  get personalities(): PetPersonality[] { return [...this._personalities]; }
  get imageUrls(): string[] { return [...this._imageUrls]; }
  get description(): string { return this._description; }
  get userId(): string { return this._userId; }
  get createdAt(): Date { return new Date(this._createdAt); }
  get updatedAt(): Date { return new Date(this._updatedAt); }
}
