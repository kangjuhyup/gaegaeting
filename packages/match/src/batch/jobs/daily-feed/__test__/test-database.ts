import { DataSource, QueryRunner, In } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as dotenv from 'dotenv';
import { DatabaseSchema, FeedItemOrmEntity, FeedOrmEntity, getEntitiesBySchema, LikeOrmEntity, LocationOrmEntity, MainAreaOrmEntity, PairOrmEntity } from '@core/database';
import { ulid } from 'ulid';

// 환경 변수 로드
dotenv.config();

// 테스트용 트랜잭션 관리를 위한 클래스
export class TestTransaction {
  private queryRunner: QueryRunner | null = null;
  private dataSource: DataSource;

  constructor(dataSource: DataSource) {
    this.dataSource = dataSource;
  }

  // 트랜잭션 시작
  async start(): Promise<QueryRunner> {
    if (this.queryRunner && this.queryRunner.isTransactionActive) {
      await this.rollback();
    }
    
    this.queryRunner = this.dataSource.createQueryRunner();
    await this.queryRunner.connect();
    await this.queryRunner.startTransaction();
    return this.queryRunner;
  }

  // 현재 쿼리러너 가져오기
  async getQueryRunner(): Promise<QueryRunner> {
    if (!this.queryRunner || !this.queryRunner.isTransactionActive) {
      return await this.start();
    }
    return this.queryRunner;
  }

  // 트랜잭션 롤백
  async rollback(): Promise<void> {
    if (this.queryRunner && this.queryRunner.isTransactionActive) {
      await this.queryRunner.rollbackTransaction();
      await this.queryRunner.release();
      this.queryRunner = null;
    }
  }
}

// 테스트 데이터베이스 설정
export const createTestDataSource = async (): Promise<DataSource> => {
  const configService = new ConfigService();
  
  // 테스트용 데이터베이스 연결 설정
  const dataSource = new DataSource({
    type: 'mysql',
    host: 'localhost',
    port: 3306,
    username: 'root',
    password: '1234',
    database: 'ggt_test',
    entities: [PairOrmEntity, LikeOrmEntity, FeedOrmEntity, FeedItemOrmEntity, LocationOrmEntity, MainAreaOrmEntity],
    synchronize: true, // 테스트를 위해 스키마 동기화 활성화
    dropSchema: true,
    legacySpatialSupport: false,
  });

  try {
    await dataSource.initialize();
  } catch (error) {
    console.error('테스트 데이터베이스 연결 실패:', error);
    throw error;
  }
  
  return dataSource;
};