/**
 * pet.ts - 강아지 관련 열거형 정의
 */

/**
 * 강아지 성별 열거형
 */
export enum PetGender {
  MALE = '0',         // 수컷
  FEMALE = '1',     // 암컷
}

/**
 * 강아지 크기 열거형
 */
export enum PetSize {
  SMALL = '0',       // 소형견 (10kg 미만)
  MEDIUM = '1',     // 중형견 (10kg~25kg)
  LARGE = '2',       // 대형견 (25kg 이상)
}

/**
 * 강아지 품종 열거형
 */
export enum PetBreed {
  MALTESE = '0',                 // 말티즈
  POODLE = '1',                   // 푸들
  CHIHUAHUA = '2',             // 치와와
  POMERANIAN = '3',           // 포메라니안
  SHIH_TZU = '4',               // 시츄
  YORKSHIRE_TERRIER = '5', // 요크셔 테리어
  BEAGLE = '6',                   // 비글
  GOLDEN_RETRIEVER = '7', // 골든 리트리버
  LABRADOR_RETRIEVER = '8', // 래브라도 리트리버
  BORDER_COLLIE = '9',     // 보더 콜리
  SAMOYED = '10',                 // 사모예드
  HUSKY = '11',                     // 허스키
  GERMAN_SHEPHERD = '12', // 저먼 셰퍼드
  JINDO = '13',                     // 진돗개
  MIXED = '14',                     // 믹스견
  OTHER = '15',                     // 기타
}

/**
 * 강아지 성격 특성 열거형
 */
export enum PetPersonality {
  FRIENDLY = '0',               // 친근함
  ACTIVE = '1',                   // 활발함
  CALM = '2',                       // 차분함
  PLAYFUL = '3',                 // 장난기 많음
  SHY = '4',                         // 수줍음
  INDEPENDENT = '5',         // 독립적
  SOCIAL = '6',                   // 사교적
  PROTECTIVE = '7',           // 보호적
  CURIOUS = '8',                 // 호기심 많음
  INTELLIGENT = '9',         // 영리함
}