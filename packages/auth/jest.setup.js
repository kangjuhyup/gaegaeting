// jest.setup.js
// Jest 테스트 실행 전에 설정되는 파일입니다.

// 테스트 타임아웃 설정
jest.setTimeout(30000);

// 환경 변수 설정 (테스트용)
process.env.NODE_ENV = 'test';

// 테스트 후 정리 작업
afterAll(async () => {
  // DB 연결 정리는 각 테스트에서 처리
  await new Promise(resolve => setTimeout(resolve, 500));
});
