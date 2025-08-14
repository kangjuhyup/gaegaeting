/**
 * user.ts - 사용자 관련 열거형 정의
 */


/**
 * 사용자 성별 열거형
 */
export enum UserGender {
  MALE = '0',
  FEMALE = '1',
  OTHER = '2',
}

/**
 * 사용자 회원 상태 열거형
 */
export enum UserStatus {
  ACTIVE = '0',         // 활성화
  INACTIVE = '1',     // 비활성화
  SUSPENDED = '2',   // 정지
  DELETED = '3',       // 탈퇴
}

/**
 * 사용자 인증 방식 열거형
 */
export enum AuthProvider {
  EMAIL = '0',           // 이메일 가입
  GOOGLE = '1',         // 구글 연동
  KAKAO = '2',           // 카카오 연동
  NAVER = '3',           // 네이버 연동
  APPLE = '4',           // 애플 연동
}

/**
 * 사용자 생활 지역 열거형
 */
export enum UserRegion {
  SEOUL = '0',                 // 서울
  GYEONGGI = '1',           // 경기
  INCHEON = '2',             // 인천
  GANGWON = '3',             // 강원
  CHUNGCHEONG = '4',     // 충청
  JEOLLA = '5',               // 전라
  GYEONGSANG = '6',       // 경상
  JEJU = '7',                   // 제주
}
