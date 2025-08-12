import { Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

/**
 * 사용자 성별 열거형
 */
export enum UserGender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
}

/**
 * 사용자 회원 상태 열거형
 */
export enum UserStatus {
  ACTIVE = 'ACTIVE',         // 활성화
  INACTIVE = 'INACTIVE',     // 비활성화
  SUSPENDED = 'SUSPENDED',   // 정지
  DELETED = 'DELETED',       // 탈퇴
}

/**
 * 사용자 인증 방식 열거형
 */
export enum AuthProvider {
  EMAIL = 'EMAIL',           // 이메일 가입
  GOOGLE = 'GOOGLE',         // 구글 연동
  KAKAO = 'KAKAO',           // 카카오 연동
  NAVER = 'NAVER',           // 네이버 연동
  APPLE = 'APPLE',           // 애플 연동
}

/**
 * 사용자 생활 지역 열거형
 */
export enum UserRegion {
  SEOUL = 'SEOUL',                 // 서울
  GYEONGGI = 'GYEONGGI',           // 경기
  INCHEON = 'INCHEON',             // 인천
  GANGWON = 'GANGWON',             // 강원
  CHUNGCHEONG = 'CHUNGCHEONG',     // 충청
  JEOLLA = 'JEOLLA',               // 전라
  GYEONGSANG = 'GYEONGSANG',       // 경상
  JEJU = 'JEJU',                   // 제주
}

/**
 * 사용자 ID 컴포넌트
 */
export class UserIdColumn {
  /**
   * 사용자 ID
   */
  @Column({ primary: true, type: 'varchar', length: 26, name: 'id' })
  id: string;
}

/**
 * 사용자 기본 정보 컴포넌트
 */
export class UserBasicInfoColumn {
  /**
   * 이메일
   */
  @Column({ type: 'varchar', length: 255, unique: true, name: 'email' })
  email: string;

  /**
   * 비밀번호 해시
   */
  @Column({ type: 'varchar', length: 255, nullable: true, name: 'password_hash' })
  passwordHash: string | null;

  /**
   * 닉네임
   */
  @Column({ type: 'varchar', length: 50, name: 'nickname' })
  nickname: string;

  /**
   * 프로필 이미지 URL
   */
  @Column({ type: 'varchar', length: 255, nullable: true, name: 'profile_image_url' })
  profileImageUrl: string | null;
}

/**
 * 사용자 개인 정보 컴포넌트
 */
export class UserPersonalInfoColumn {
  /**
   * 성별
   */
  @Column({ type: 'enum', enum: UserGender, default: UserGender.OTHER, name: 'gender' })
  gender: UserGender;

  /**
   * 생년월일
   */
  @Column({ type: 'date', name: 'birth_date' })
  birthDate: Date;

  /**
   * 생활 지역
   */
  @Column({ type: 'enum', enum: UserRegion, default: UserRegion.SEOUL, name: 'region' })
  region: UserRegion;

  /**
   * 자기소개
   */
  @Column({ type: 'text', nullable: true, name: 'bio' })
  bio: string | null;

  /**
   * 전화번호
   */
  @Column({ type: 'varchar', length: 20, nullable: true, name: 'phone_number' })
  phoneNumber: string | null;
}

/**
 * 사용자 상태 컴포넌트
 */
export class UserStatusColumn {
  /**
   * 회원 상태
   */
  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.ACTIVE, name: 'status' })
  status: UserStatus;
}

// 나머지 인증 관련 컴포넌트는 Auth 엔티티로 이동되었습니다.

/**
 * 사용자 메타데이터 컴포넌트
 */
export class UserMetadataColumn {
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
