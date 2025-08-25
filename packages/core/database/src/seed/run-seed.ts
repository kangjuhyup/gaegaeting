import { DataSource } from 'typeorm';
import { seedAuthAndUsers } from './test-data.seed';
import { 
  UserOrmEntity, 
  AuthOrmEntity, 
  PetOrmEntity, 
  UserAttachmentOrmEntity, 
  PetAttachmentOrmEntity, 
  LocationOrmEntity, 
  MainAreaOrmEntity 
} from '../entity';

/**
 * 테스트 데이터 시드 실행 스크립트
 * 
 * 사용법:
 * 1. npm run build (또는 yarn build)로 먼저 빌드
 * 2. node dist/seed/run-seed.js로 실행
 */
async function runSeed() {
  console.log('테스트 데이터 시드 시작...');
  
  // 데이터소스 설정
  const accountDataSource = new DataSource({
    type: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '1234',
    database: process.env.DB_DATABASE || 'ggt_account',
    entities: [
      UserOrmEntity, 
      AuthOrmEntity, 
      PetOrmEntity, 
      UserAttachmentOrmEntity, 
      PetAttachmentOrmEntity, 
    ],
    synchronize: false, // 주의: 프로덕션에서는 false로 설정
  });

  const matchDataSource = new DataSource({
    type: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '1234',
    database: process.env.DB_DATABASE || 'ggt_match',
    entities: [
      MainAreaOrmEntity,
      LocationOrmEntity
    ],
    synchronize: false, // 주의: 프로덕션에서는 false로 설정
  });



  try {
    // 데이터소스 초기화
    await accountDataSource.initialize();
    await matchDataSource.initialize();
    console.log('데이터베이스 연결 성공');

    // 시드 실행
    const { userIds, authKeys, petIds } = await seedAuthAndUsers(accountDataSource.manager, matchDataSource.manager, {
      count: 10000, // 생성할 사용자 수 (기본값보다 적게 설정)
      withPets: true,
      withGeo: true,
    });

    console.log(`생성된 사용자 수: ${userIds.length}`);
    console.log(`생성된 인증 정보 수: ${authKeys.length}`);
    console.log(`생성된 반려동물 수: ${petIds.length}`);
    
    // 샘플 사용자 ID 출력 (테스트용)
    if (userIds.length > 0) {
      console.log('샘플 사용자 ID (테스트에 사용 가능):');
      console.log(userIds.slice(0, 5));
    }

  } catch (error) {
    console.error('시드 실행 중 오류 발생:', error);
  } finally {
    // 연결 종료
    if (accountDataSource.isInitialized) {
      await accountDataSource.destroy();
      console.log('데이터베이스 연결 종료');
    }
  }
}

// 스크립트 실행
runSeed().catch(error => {
  console.error('최상위 오류:', error);
  process.exit(1);
});
