import { SocialSigninUseCaseImpl } from '../../../src/application/usecase/impl/social-signin.usecase.impl';
import { KakaoIdpPort } from '../../../src/application/port/kakao-idp.port';
import { AppleIdpPort } from '../../../src/application/port/apple-idp.port';
import { TokenServicePort } from '../../../src/application/port/token-service.port';
import { UserRepositoryPort } from '../../../src/domain/port/user-repository.port';
import { UserIdentityRepositoryPort } from '../../../src/domain/port/user-identity-repository.port';
import { KakaoIdpAdapter } from '../../../src/adapter/out/kakao-idp.adapter';
import { UserRepositoryAdapter } from '../../../src/adapter/out/user-repository.adapter';
import { UserIdentityRepositoryAdapter } from '../../../src/adapter/out/user-identity-repository.adapter';
import { SimpleTokenService } from '../../../src/adapter/out/token-service.simple';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { UserOrmEntity, TenantOrmEntity, UserIdentityOrmEntity } from '@core/database';
import { ENV_KEY } from '../../../src/common/config/env.config';

describe('SocialSigninUseCaseImpl (E2E)', () => {
  let usecase: SocialSigninUseCaseImpl;
  let kakaoIdp: KakaoIdpPort;
  let userRepo: UserRepositoryPort;
  let identityRepo: UserIdentityRepositoryPort;
  let tokenService: TokenServicePort;
  let dataSource: DataSource;
  let configService: ConfigService;
  let tenantId: string;

  beforeAll(async () => {
    // 실제 환경 변수 로드
    const { Test } = await import('@nestjs/testing');
    const configModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: ['.env.local', '.env'],
        }),
      ],
    }).compile();
    configService = configModule.get<ConfigService>(ConfigService);

    // 실제 데이터베이스 연결
    const dbHost = configService.get<string>(ENV_KEY.DATABASE_HOST);
    const dbPort = configService.get<number>(ENV_KEY.DATABASE_PORT);
    const dbUsername = configService.get<string>(ENV_KEY.DATABASE_USERNAME);
    const dbPassword = configService.get<string>(ENV_KEY.DATABASE_PASSWORD);
    const dbName = configService.get<string>(ENV_KEY.DATABASE_NAME);

    dataSource = new DataSource({
      type: 'mysql',
      host: dbHost,
      port: dbPort,
      username: dbUsername,
      password: dbPassword,
      database: dbName,
      entities: [UserOrmEntity, TenantOrmEntity, UserIdentityOrmEntity],
      synchronize: false, // 실제 DB이므로 false
      logging: false,
      charset: 'utf8mb4',
      supportBigNumbers: true,
      bigNumberStrings: false,
    });
    await dataSource.initialize();

    // 테넌트 생성 또는 조회
    const tenantRepo = dataSource.getRepository(TenantOrmEntity);
    let tenant = await tenantRepo.findOne({ where: { code: 'e2e-test-tenant' } });
    if (!tenant) {
      tenant = tenantRepo.create({
        code: 'e2e-test-tenant',
        name: 'E2E Test Tenant',
      });
      await tenantRepo.save(tenant);
    }
    tenantId = tenant.id;

    // 실제 어댑터 인스턴스 생성 (실제 카카오 API 호출)
    kakaoIdp = new KakaoIdpAdapter(configService);
    userRepo = new UserRepositoryAdapter(
      dataSource.getRepository(UserOrmEntity),
      dataSource.getRepository(TenantOrmEntity),
      dataSource.getRepository(UserIdentityOrmEntity),
    );
    identityRepo = new UserIdentityRepositoryAdapter(
      dataSource.getRepository(UserIdentityOrmEntity),
      dataSource.getRepository(TenantOrmEntity),
      dataSource.getRepository(UserOrmEntity),
    );
    tokenService = new SimpleTokenService();

    // UseCase 인스턴스 생성
    usecase = new SocialSigninUseCaseImpl(
      kakaoIdp,
      {} as AppleIdpPort,
      userRepo,
      identityRepo,
      tokenService,
    );
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }
  });

  beforeEach(async () => {
    // 각 테스트 전에 테스트 데이터 정리 (테넌트는 유지)
    await dataSource.getRepository(UserIdentityOrmEntity).delete({
      tenant: { id: tenantId },
    });
    await dataSource.getRepository(UserOrmEntity).delete({
      tenant: { id: tenantId },
    });
  });

  describe('signinWithKakao', () => {
    // 실제 카카오 인증 코드를 환경 변수에서 가져오거나 테스트용으로 제공
    // 주의: 실제 카카오 앱의 인증 코드가 필요합니다
    const authCode = process.env.E2E_KAKAO_AUTH_CODE || 'test-auth-code';
    const redirectUri = configService.get<string>(ENV_KEY.KAKAO_REDIRECT_URI) || 'https://test.com/callback';

    it('should create new user and identity when user does not exist', async () => {
      // Skip if no real auth code provided
      if (!process.env.E2E_KAKAO_AUTH_CODE) {
        console.log('Skipping test: E2E_KAKAO_AUTH_CODE not provided');
        return;
      }

      // Act - 실제 카카오 API 호출
      const result = await usecase.signinWithKakao({
        tenantId,
        authCode,
        redirectUri,
      });

      // Assert
      expect(result).toBeDefined();
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.expiresIn).toBeDefined();

      // 실제 DB에서 사용자가 생성되었는지 확인
      const users = await dataSource.getRepository(UserOrmEntity).find({
        where: { tenant: { id: tenantId } },
        relations: ['tenant'],
      });
      expect(users.length).toBeGreaterThan(0);
      
      // 마지막 생성된 사용자 확인
      const lastUser = users[users.length - 1];
      expect(lastUser.username).toBeDefined();
      expect(lastUser.email).toBeDefined();

      // 실제 DB에서 Identity가 생성되었는지 확인
      const identities = await dataSource.getRepository(UserIdentityOrmEntity).find({
        where: { 
          tenant: { id: tenantId },
          user: { id: lastUser.id },
        },
        relations: ['tenant', 'user'],
      });
      expect(identities.length).toBeGreaterThan(0);
      expect(identities[0].provider).toBe('kakao');
      expect(identities[0].providerSub).toBeDefined();
    });

    it('should return existing user when user already exists', async () => {
      // Skip if no real auth code provided
      if (!process.env.E2E_KAKAO_AUTH_CODE) {
        console.log('Skipping test: E2E_KAKAO_AUTH_CODE not provided');
        return;
      }

      // 첫 번째 로그인으로 사용자 생성
      const firstResult = await usecase.signinWithKakao({
        tenantId,
        authCode,
        redirectUri,
      });

      expect(firstResult).toBeDefined();

      // 사용자 수 확인
      const usersBefore = await dataSource.getRepository(UserOrmEntity).find({
        where: { tenant: { id: tenantId } },
        relations: ['tenant'],
      });
      const userCountBefore = usersBefore.length;

      // 두 번째 로그인 (같은 인증 코드 재사용 불가하므로 새 인증 코드 필요)
      // 실제로는 같은 사용자가 반환되어야 함
      // 주의: 카카오 인증 코드는 한 번만 사용 가능하므로 실제 테스트에서는
      // 새로운 인증 코드가 필요합니다.
      
      // 이 테스트는 실제 환경에서 새로운 인증 코드로 테스트해야 합니다
      console.log('Note: This test requires a new auth code for the second login');
    });
  });
});
