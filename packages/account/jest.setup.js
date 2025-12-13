// jest.setup.js
// Jest 테스트 실행 전에 설정되는 파일입니다.

// 테스트 타임아웃 설정 (기본값: 5초)
jest.setTimeout(10000);

// 콘솔 출력 제어 (필요한 경우 주석 해제)
// console.error = jest.fn();
// console.warn = jest.fn();

// 환경 변수 설정 (테스트용)
process.env.NODE_ENV = 'test';

/**
 * UNIT 테스트에서는 트랜잭션 데코레이터가 실제 DB/QueryRunner를 열지 않도록 no-op 처리한다.
 * - 다른 export(UserProfileStatus 등)는 그대로 유지하기 위해 partial mock 사용
 */
jest.mock('@core/database', () => {
  const actual = jest.requireActual('@core/database');
  return {
    ...actual,
    Transactional:
      () =>
      (_target, _propertyKey, descriptor) => descriptor,
  };
});

// 필요한 경우 전역 모의(mock) 설정
// global.fetch = jest.fn();

// 테스트 후 정리 작업
afterAll(async () => {
  // 필요한 정리 작업이 있다면 여기에 추가
  // 예: 데이터베이스 연결 종료 등
});
