import { ulid } from "ulid";
import * as crypto from "crypto";

/**
 * 사용자 성별 열거형
 */
export enum UserGender {
  MALE = "MALE",
  FEMALE = "FEMALE",
  OTHER = "OTHER",
}

/**
 * 사용자 회원 상태 열거형
 */
export enum UserStatus {
  ACTIVE = "ACTIVE", // 활성화
  INACTIVE = "INACTIVE", // 비활성화
  SUSPENDED = "SUSPENDED", // 정지
  DELETED = "DELETED", // 탈퇴
}

/**
 * 사용자 인증 방식 열거형
 */
export enum AuthProvider {
  EMAIL = "EMAIL", // 이메일 가입
  GOOGLE = "GOOGLE", // 구글 연동
  KAKAO = "KAKAO", // 카카오 연동
  NAVER = "NAVER", // 네이버 연동
  APPLE = "APPLE", // 애플 연동
}

/**
 * 사용자 생활 지역 열거형
 */
export enum UserRegion {
  SEOUL = "SEOUL", // 서울
  GYEONGGI = "GYEONGGI", // 경기
  INCHEON = "INCHEON", // 인천
  GANGWON = "GANGWON", // 강원
  CHUNGCHEONG = "CHUNGCHEONG", // 충청
  JEOLLA = "JEOLLA", // 전라
  GYEONGSANG = "GYEONGSANG", // 경상
  JEJU = "JEJU", // 제주
}

/**
 * 사용자 도메인 엔티티
 */
export class UserEntity {
  private readonly _id: string;
  private _email: string;
  private _passwordHash?: string;
  private _nickname: string;
  private _profileImageUrl?: string;
  private _gender: UserGender;
  private _birthDate: Date;
  private _region: UserRegion;
  private _bio?: string;
  private _phoneNumber: string;
  private _authProvider: AuthProvider;
  private _authProviderId?: string;
  private _status: UserStatus;
  private _lastLoginAt?: Date;
  private _createdAt: Date;
  private _updatedAt: Date;

  /**
   * 사용자 엔티티 생성자
   *
   * @param id 사용자 ID (없으면 자동 생성)
   * @param email 이메일
   * @param passwordHash 비밀번호 해시 (소셜 로그인의 경우 생략 가능)
   * @param password 비밀번호 (이메일 가입의 경우 필요)
   * @param nickname 닉네임
   * @param profileImageUrl 프로필 이미지 URL
   * @param gender 성별
   * @param birthDate 생년월일
   * @param region 생활 지역
   * @param bio 자기소개
   * @param phoneNumber 전화번호
   * @param authProvider 인증 방식
   * @param authProviderId 소셜 로그인 제공자 ID
   * @param status 회원 상태
   * @param lastLoginAt 마지막 로그인 시간
   * @param createdAt 생성 시간 (없으면 현재 시간)
   * @param updatedAt 수정 시간 (없으면 현재 시간)
   */
  constructor(param: {
    id?: string | null;
    email: string;
    password: string;
    nickname?: string;
    profileImageUrl?: string;
    gender?: UserGender;
    birthDate?: Date;
    region?: UserRegion;
    bio?: string;
    phoneNumber: string;
    authProvider?: AuthProvider;
    authProviderId?: string;
    status?: UserStatus;
    lastLoginAt?: Date;
    createdAt?: Date | null;
    updatedAt?: Date | null;
  }) {
    const {
      id = null,
      email,
      password,
      nickname = "",
      profileImageUrl,
      gender = UserGender.OTHER,
      birthDate = new Date(),
      region = UserRegion.SEOUL,
      bio = "",
      phoneNumber,
      authProvider = AuthProvider.EMAIL,
      authProviderId,
      status = UserStatus.ACTIVE,
      lastLoginAt,
      createdAt = null,
      updatedAt = null
    } = param;
    
    this._id = id || ulid();
    this._email = email;
    this._passwordHash = this.isPasswordHashed(password) ? password : this.hashPassword(password);
    this._nickname = nickname;
    this._profileImageUrl = profileImageUrl;
    this._gender = gender;
    this._birthDate = birthDate;
    this._region = region;
    this._bio = bio;
    this._phoneNumber = phoneNumber;
    this._authProvider = authProvider;
    this._authProviderId = authProviderId;
    this._status = status;
    this._lastLoginAt = lastLoginAt;
    this._createdAt = createdAt || new Date();
    this._updatedAt = updatedAt || new Date();

    this.validate();
  }

  /**
   * 문자열이 해시된 비밀번호 형식인지 확인합니다.
   * 
   * @param password 확인할 문자열
   * @returns 해시된 비밀번호 형식이면 true, 아니면 false
   */
  private isPasswordHashed(password: string): boolean {
    // 비밀번호가 없으면 해시되지 않은 것으로 간주
    if (!password) return false;
    
    // 해시된 비밀번호는 'salt:hash' 형태를 가짐
    const parts = password.split(':');
    
    // 두 부분으로 나뉘어져 있고, 두 번째 부분(해시)이 충분히 길어야 함
    return parts.length === 2 && parts[1].length >= 64;
  }

  /**
   * 사용자 엔티티 유효성 검증
   */
  private validate(): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!this._email || !emailRegex.test(this._email)) {
      throw new Error("유효한 이메일 주소를 입력해주세요.");
    }

    if (this._authProvider === AuthProvider.EMAIL && !this._passwordHash) {
      throw new Error("이메일 회원가입의 경우 비밀번호가 필요합니다.");
    }

    if (this._nickname && this._nickname.length > 20) {
      throw new Error("닉네임은 20자를 초과할 수 없습니다.");
    }
  }

  /**
   * 사용자 프로필 정보 업데이트
   *
   * @param nickname 닉네임
   * @param profileImageUrl 프로필 이미지 URL
   * @param gender 성별
   * @param region 생활 지역
   * @param bio 자기소개
   */
  updateProfile(
    nickname?: string,
    profileImageUrl?: string,
    gender?: UserGender,
    region?: UserRegion,
    bio?: string,
  ): void {
    if (nickname !== undefined) this._nickname = nickname;
    if (profileImageUrl !== undefined) this._profileImageUrl = profileImageUrl;
    if (gender !== undefined) this._gender = gender;
    if (region !== undefined) this._region = region;
    if (bio !== undefined) this._bio = bio;

    this._updatedAt = new Date();
    this.validate();
  }

  /**
   * 패스워드 해싱 함수 (scrypt 사용)
   *
   * @param password 해싱할 원본 비밀번호
   * @returns 해싱된 비밀번호
   */
  private hashPassword(password: string): string {
    // crypto 모듈의 scrypt를 사용하여 비밀번호 해싱
    const salt = crypto.randomBytes(16).toString("hex");
    const hash = crypto.scryptSync(password, salt, 64).toString("hex");

    // salt와 hash를 함께 저장 (구분자로 구분)
    return `${salt}:${hash}`;
  }

  /**
   * 비밀번호 검증 함수
   *
   * @param password 검증할 원본 비밀번호
   * @returns 검증 결과 (true: 일치, false: 불일치)
   */
  verifyPassword(password: string): boolean {
    if (!this._passwordHash) return false;

    // 저장된 해시에서 salt와 hash 분리
    const [salt, storedHash] = this._passwordHash.split(":");

    // 입력된 비밀번호로 해시 생성
    const hash = crypto.scryptSync(password, salt, 64).toString("hex");

    // 저장된 해시와 비교
    return storedHash === hash;
  }

  /**
   * 사용자 비밀번호 변경
   *
   * @param password 새 비밀번호
   */
  async updatePassword(password: string): Promise<void> {
    this._passwordHash = await this.hashPassword(password);
    this._updatedAt = new Date();
  }

  /**
   * 사용자 상태 변경
   *
   * @param status 변경할 상태
   */
  updateStatus(status: UserStatus): void {
    this._status = status;
    this._updatedAt = new Date();
  }

  /**
   * 로그인 시간 갱신
   */
  updateLastLogin(): void {
    this._lastLoginAt = new Date();
    this._updatedAt = new Date();
  }

  /**
   * 사용자 탈퇴 처리
   */
  deleteAccount(): void {
    this._status = UserStatus.DELETED;
    this._updatedAt = new Date();
  }

  // Getters
  get id(): string {
    return this._id;
  }
  get email(): string {
    return this._email;
  }
  get passwordHash(): string | undefined {
    return this._passwordHash;
  }
  get nickname(): string {
    return this._nickname;
  }
  get profileImageUrl(): string | undefined {
    return this._profileImageUrl;
  }
  get gender(): UserGender {
    return this._gender;
  }
  get birthDate(): Date {
    return new Date(this._birthDate);
  }
  get region(): UserRegion {
    return this._region;
  }
  get bio(): string | undefined {
    return this._bio;
  }
  get phoneNumber(): string | undefined {
    return this._phoneNumber;
  }
  get authProvider(): AuthProvider {
    return this._authProvider;
  }
  get authProviderId(): string | undefined {
    return this._authProviderId;
  }
  get status(): UserStatus {
    return this._status;
  }
  get lastLoginAt(): Date | undefined {
    return this._lastLoginAt ? new Date(this._lastLoginAt) : undefined;
  }
  get createdAt(): Date {
    return new Date(this._createdAt);
  }
  get updatedAt(): Date {
    return new Date(this._updatedAt);
  }

  /**
   * 사용자가 활성 상태인지 확인
   */
  isActive(): boolean {
    return this._status === UserStatus.ACTIVE;
  }
}
