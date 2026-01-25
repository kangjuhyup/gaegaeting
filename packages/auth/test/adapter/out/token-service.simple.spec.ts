// @core/redis 모듈 모킹 (import 전에 호출해야 함)
// 실제 모듈이 로드되지 않도록 완전히 모킹
jest.mock('@core/redis', () => {
  const mockCacheService = class {
    constructor(...args: any[]) {
      // 생성자 인수 무시
    }
    get = jest.fn();
    set = jest.fn();
    del = jest.fn();
    wrap = jest.fn();
    mdel = jest.fn();
  };
  
  return {
    CacheService: mockCacheService,
    RedisCacheModule: {
      forRoot: jest.fn(),
      forRootAsync: jest.fn(),
    },
    RedisPubSubModule: {
      forRoot: jest.fn(),
      forRootAsync: jest.fn(),
    },
    RedisRedlockModule: {
      forRoot: jest.fn(),
      forRootAsync: jest.fn(),
    },
  };
});

import { ConfigService } from '@nestjs/config';
import { CacheService } from '@core/redis';
import { TokenService } from '../../../src/application/service/token.service';
import { JwtPort } from '../../../src/application/port/jwt.port';
import { ENV_KEY } from '../../../src/common/config/env.config';
import { TokenMetadata } from '../../../src/application/port/token-service.port';

describe('TokenService (UNIT)', () => {
  let tokenService: TokenService;
  let jwtPort: jest.Mocked<JwtPort>;
  let configService: jest.Mocked<ConfigService>;
  let cacheService: jest.Mocked<CacheService>;

  const tenantId = 'test-tenant';
  const userId = 'user-123';
  const jwtSecret = 'test-secret';
  const accessExpiration = '1h';
  const refreshExpiration = '30d';

  beforeEach(() => {
    // Mock 생성
    jwtPort = {
      sign: jest.fn(),
      verify: jest.fn(),
    } as jest.Mocked<JwtPort>;

    configService = {
      get: jest.fn(),
    } as any;

    // CacheService 인스턴스 생성 (모킹된 클래스 사용)
    // 모킹된 클래스는 생성자 인수를 무시하므로 빈 객체 전달
    cacheService = new CacheService({} as any, {} as any) as jest.Mocked<CacheService>;

    // ConfigService 기본값 설정
    configService.get.mockImplementation((key: string) => {
      if (key === ENV_KEY.JWT_SECRET) return jwtSecret;
      if (key === ENV_KEY.JWT_ACCESS_EXPIRATION) return accessExpiration;
      if (key === ENV_KEY.JWT_REFRESH_EXPIRATION) return refreshExpiration;
      return undefined;
    });

    // 직접 인스턴스 생성
    tokenService = new TokenService(jwtPort, configService, cacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('issueForUser', () => {
    it('should issue access and refresh tokens and store them in Redis', async () => {
      // Arrange
      const mockAccessToken = 'access-token-123';
      const mockRefreshToken = 'refresh-token-456';
      const currentTime = Math.floor(Date.now() / 1000);
      const accessExpiresIn = 3600; // 1h
      const refreshExpiresIn = 2592000; // 30d

      jwtPort.sign
        .mockResolvedValueOnce(mockAccessToken)
        .mockResolvedValueOnce(mockRefreshToken);

      // issueForUser 호출 순서:
      // 1. access token 메타데이터 저장 (set, 'token')
      // 2. refresh token 메타데이터 저장 (set, 'token')
      // 3. access token을 사용자 목록에 추가: get (기존 목록 조회) -> set (목록 업데이트)
      // 4. refresh token을 사용자 목록에 추가: get (기존 목록 조회) -> set (목록 업데이트)
      cacheService.get
        .mockResolvedValueOnce(null) // 기존 access token 목록 조회 (비어있음)
        .mockResolvedValueOnce(null); // 기존 refresh token 목록 조회 (비어있음)
      cacheService.set.mockResolvedValue(undefined);

      // Act
      const result = await tokenService.issueForUser({
        tenantId,
        userId,
      });

      // Assert
      expect(result).toEqual({
        accessToken: mockAccessToken,
        refreshToken: mockRefreshToken,
        expiresIn: accessExpiresIn,
      });

      // JWT 서명 확인
      expect(jwtPort.sign).toHaveBeenCalledTimes(2);
      expect(jwtPort.sign).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          userId,
          tenantId,
          iat: expect.any(Number),
          exp: expect.any(Number),
        }),
        {
          secret: jwtSecret,
        },
      );
      expect(jwtPort.sign).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          userId,
          tenantId,
          iat: expect.any(Number),
          exp: expect.any(Number),
          type: 'refresh',
        }),
        {
          secret: jwtSecret,
        },
      );

      // Redis 저장 확인
      expect(cacheService.set).toHaveBeenCalledTimes(4); // 토큰 메타데이터 2개 + 사용자별 토큰 목록 2개

      // 토큰 메타데이터 저장 확인
      const setCalls = cacheService.set.mock.calls as Array<[string, any, number?, string?]>;
      const tokenMetadataCalls = setCalls.filter((call) => call[3] === 'token');
      expect(tokenMetadataCalls).toHaveLength(2);

      // Access token 메타데이터 확인
      const accessMetadataCall = tokenMetadataCalls.find((call) =>
        call[0].startsWith('access:'),
      );
      expect(accessMetadataCall).toBeDefined();
      expect(accessMetadataCall![1]).toEqual(
        expect.objectContaining({
          userId,
          tenantId,
          type: 'access',
          iat: expect.any(Number),
          exp: expect.any(Number),
        }),
      );
      expect(accessMetadataCall![2]).toBe(accessExpiresIn);
      expect(accessMetadataCall![3]).toBe('token');

      // Refresh token 메타데이터 확인
      const refreshMetadataCall = tokenMetadataCalls.find((call) =>
        call[0].startsWith('refresh:'),
      );
      expect(refreshMetadataCall).toBeDefined();
      expect(refreshMetadataCall![1]).toEqual(
        expect.objectContaining({
          userId,
          tenantId,
          type: 'refresh',
          iat: expect.any(Number),
          exp: expect.any(Number),
        }),
      );
      expect(refreshMetadataCall![2]).toBe(refreshExpiresIn);
      expect(refreshMetadataCall![3]).toBe('token');
    });

    it('[issueForUser] - JWT_SECRET이 설정되지 않았을 때 에러 발생', async () => {
      // Arrange
      configService.get.mockReturnValue(undefined);

      // Act & Assert
      await expect(
        tokenService.issueForUser({
          tenantId,
          userId,
        }),
      ).rejects.toThrow('JWT_SECRET is not configured');
    });

    it('[issueForUser] - 사용자 토큰 목록에 토큰 추가', async () => {
      // Arrange
      const mockAccessToken = 'access-token-123';
      const mockRefreshToken = 'refresh-token-456';

      jwtPort.sign
        .mockResolvedValueOnce(mockAccessToken)
        .mockResolvedValueOnce(mockRefreshToken);

      cacheService.get
        .mockResolvedValueOnce(null) // 기존 access token 목록 조회 (비어있음)
        .mockResolvedValueOnce(null); // 기존 refresh token 목록 조회 (비어있음)
      cacheService.set.mockResolvedValue(undefined);

      // Act
      await tokenService.issueForUser({
        tenantId,
        userId,
      });

      // Assert
      // 사용자별 토큰 목록에 추가 확인
      const userTokenListCalls = (cacheService.set.mock.calls as Array<[string, any, number?, string?]>).filter(
        (call) => call[3] === 'user-tokens',
      );
      expect(userTokenListCalls).toHaveLength(2);

      // Access token 목록 확인
      const accessTokenListCall = userTokenListCalls.find((call) =>
        call[0].includes(':access'),
      );
      expect(accessTokenListCall).toBeDefined();
      expect(accessTokenListCall![1]).toEqual([mockAccessToken]);

      // Refresh token 목록 확인
      const refreshTokenListCall = userTokenListCalls.find((call) =>
        call[0].includes(':refresh'),
      );
      expect(refreshTokenListCall).toBeDefined();
      expect(refreshTokenListCall![1]).toEqual([mockRefreshToken]);
    });

    it('[issueForUser] - 기존 사용자 토큰 목록에 토큰 추가', async () => {
      // Arrange
      const mockAccessToken = 'access-token-123';
      const mockRefreshToken = 'refresh-token-456';
      const existingTokens = ['existing-token-1'];

      jwtPort.sign
        .mockResolvedValueOnce(mockAccessToken)
        .mockResolvedValueOnce(mockRefreshToken);

      // issueForUser 호출 순서:
      // 1. access token 메타데이터 저장 (set, 'token') - get 호출 없음
      // 2. refresh token 메타데이터 저장 (set, 'token') - get 호출 없음
      // 3. access token을 사용자 목록에 추가: get (기존 목록 조회) -> push -> set (목록 업데이트)
      // 4. refresh token을 사용자 목록에 추가: get (기존 목록 조회) -> push -> set (목록 업데이트)
      // 주의: 배열은 참조 타입이므로, push로 수정하면 원본이 변경됩니다.
      // 따라서 각 get 호출마다 새 배열을 반환해야 합니다.
      let accessTokenListCallCount = 0;
      cacheService.get.mockImplementation((key: string, ns?: string) => {
        // access token 목록 조회인 경우 (매번 새 배열 반환)
        if (ns === 'user-tokens' && key.includes(':access')) {
          accessTokenListCallCount++;
          // 매번 새 배열을 반환해야 함 (push로 수정되므로)
          return Promise.resolve([...existingTokens]);
        }
        // refresh token 목록 조회인 경우
        if (ns === 'user-tokens' && key.includes(':refresh')) {
          return Promise.resolve([]);
        }
        // 그 외 (토큰 메타데이터 조회 등)는 null 반환
        return Promise.resolve(null);
      });

      cacheService.set.mockResolvedValue(undefined);

      // Act
      await tokenService.issueForUser({
        tenantId,
        userId,
      });

      // Assert
      const userTokenListCalls = (cacheService.set.mock.calls as Array<[string, any, number?, string?]>).filter(
        (call) => call[3] === 'user-tokens',
      );
      expect(userTokenListCalls).toHaveLength(2); // access와 refresh 각각 1번씩
      
      const accessTokenListCall = userTokenListCalls.find((call) =>
        call[0].includes(':access'),
      );
      expect(accessTokenListCall).toBeDefined();
      // get으로 가져온 배열에 push를 하므로, 기존 토큰 + 새 토큰이 포함되어야 함
      expect(accessTokenListCall![1]).toEqual([...existingTokens, mockAccessToken]);
      expect(accessTokenListCall![1]).toHaveLength(existingTokens.length + 1);
      // access token 목록 조회는 한 번만 호출되어야 함
      expect(accessTokenListCallCount).toBe(1);
    });
  });

  describe('verifyToken', () => {
    it('[verifyToken] - 유효한 토큰이고 Redis에 존재할 때 토큰 메타데이터 반환', async () => {
      // Arrange
      const token = 'valid-token';
      const decoded = {
        sub: userId,
        tenantId,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };
      const metadata: TokenMetadata = {
        userId,
        tenantId,
        iat: decoded.iat,
        exp: decoded.exp,
        type: 'access',
      };

      jwtPort.verify.mockResolvedValue(decoded as any);
      cacheService.get.mockResolvedValue(metadata);

      // Act
      const result = await tokenService.verifyToken(token);

      // Assert
      expect(result).toEqual(metadata);
      expect(jwtPort.verify).toHaveBeenCalledWith(token, {
        secret: jwtSecret,
      });
      expect(cacheService.get).toHaveBeenCalledWith(
        expect.stringMatching(/^access:/),
        'token',
      );
    });

    it('[verifyToken] - 유효하지 않은 토큰일 때 null 반환', async () => {
      // Arrange
      const token = 'invalid-token';

      jwtPort.verify.mockRejectedValue(new Error('Invalid token'));

      // Act
      const result = await tokenService.verifyToken(token);

      // Assert
      expect(result).toBeNull();
      expect(cacheService.get).not.toHaveBeenCalled();
    });

    it('[verifyToken] - Redis에 토큰이 없을 때 null 반환', async () => {
      // Arrange
      const token = 'valid-token-but-not-in-redis';
      const decoded = {
        sub: userId,
        tenantId,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      jwtPort.verify.mockResolvedValue(decoded as any);
      cacheService.get.mockResolvedValue(null); // Redis에 없음

      // Act
      const result = await tokenService.verifyToken(token);

      // Assert
      expect(result).toBeNull();
      expect(cacheService.get).toHaveBeenCalled();
    });

    it('[verifyToken] - JWT_SECRET이 설정되지 않았을 때 null 반환', async () => {
      // Arrange
      const token = 'valid-token';
      configService.get.mockReturnValue(undefined);

      // Act
      const result = await tokenService.verifyToken(token);

      // Assert
      expect(result).toBeNull();
      expect(jwtPort.verify).not.toHaveBeenCalled();
    });

    it('[verifyToken] - Refresh 토큰 타입 처리', async () => {
      // Arrange
      const token = 'refresh-token';
      const decoded = {
        sub: userId,
        tenantId,
        type: 'refresh',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 2592000,
      };
      const metadata: TokenMetadata = {
        userId,
        tenantId,
        iat: decoded.iat,
        exp: decoded.exp,
        type: 'refresh',
      };

      jwtPort.verify.mockResolvedValue(decoded as any);
      cacheService.get.mockResolvedValue(metadata);

      // Act
      const result = await tokenService.verifyToken(token);

      // Assert
      expect(result).toEqual(metadata);
      expect(cacheService.get).toHaveBeenCalledWith(
        expect.stringMatching(/^refresh:/),
        'token',
      );
    });
  });

  describe('revokeToken', () => {
    it('[revokeToken] - Redis에서 토큰 삭제', async () => {
      // Arrange
      const token = 'token-to-revoke';
      const decoded = {
        sub: userId,
        tenantId,
        type: 'access',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      jwtPort.verify.mockResolvedValue(decoded as any);
      cacheService.get.mockResolvedValue(['token-to-revoke', 'other-token']);
      cacheService.del.mockResolvedValue(undefined);
      cacheService.set.mockResolvedValue(undefined);

      // Act
      await tokenService.revokeToken(token);

      // Assert
      expect(jwtPort.verify).toHaveBeenCalledWith(token, {
        secret: jwtSecret,
      });
      expect(cacheService.del).toHaveBeenCalledWith(
        expect.stringMatching(/^access:/),
        'token',
      );
      expect(cacheService.get).toHaveBeenCalledWith(
        expect.stringContaining(`${tenantId}:${userId}:access`),
        'user-tokens',
      );
      expect(cacheService.set).toHaveBeenCalledWith(
        expect.stringContaining(`${tenantId}:${userId}:access`),
        ['other-token'],
        86400 * 30,
        'user-tokens',
      );
    });

    it('[revokeToken] - 사용자 토큰 목록이 비어있을 때 목록 삭제', async () => {
      // Arrange
      const token = 'last-token';
      const decoded = {
        sub: userId,
        tenantId,
        type: 'access',
      };

      jwtPort.verify.mockResolvedValue(decoded as any);
      cacheService.get.mockResolvedValue([token]); // 마지막 토큰
      cacheService.del.mockResolvedValue(undefined);

      // Act
      await tokenService.revokeToken(token);

      // Assert
      expect(cacheService.del).toHaveBeenCalledTimes(2); // 토큰 메타데이터 + 사용자 토큰 목록
      const delCalls = cacheService.del.mock.calls;
      const userTokenListDel = delCalls.find((call) =>
        call[0].includes(`${tenantId}:${userId}:access`),
      );
      expect(userTokenListDel).toBeDefined();
    });

    it('[revokeToken] - 유효하지 않은 토큰을 우아하게 처리', async () => {
      // Arrange
      const token = 'invalid-token';

      jwtPort.verify.mockRejectedValue(new Error('Invalid token'));

      // Act & Assert (should not throw)
      await expect(tokenService.revokeToken(token)).resolves.not.toThrow();
      expect(cacheService.del).not.toHaveBeenCalled();
    });

    it('[revokeToken] - JWT_SECRET이 없을 때 우아하게 처리', async () => {
      // Arrange
      const token = 'valid-token';
      configService.get.mockReturnValue(undefined);

      // Act & Assert
      await expect(tokenService.revokeToken(token)).resolves.not.toThrow();
      expect(jwtPort.verify).not.toHaveBeenCalled();
    });
  });

  describe('revokeUserTokens', () => {
    it('[revokeUserTokens] - 사용자의 모든 토큰 무효화', async () => {
      // Arrange
      const accessTokens = ['access-token-1', 'access-token-2'];
      const refreshTokens = ['refresh-token-1'];

      cacheService.get
        .mockResolvedValueOnce(accessTokens)
        .mockResolvedValueOnce(refreshTokens);
      cacheService.del.mockResolvedValue(undefined);

      // Act
      await tokenService.revokeUserTokens(userId, tenantId);

      // Assert
      // 모든 토큰 메타데이터 삭제 확인
      // access token 2개 삭제 + refresh token 1개 삭제 + access 목록 삭제 + refresh 목록 삭제 = 5번
      expect(cacheService.del).toHaveBeenCalledTimes(5);

      const delCalls = cacheService.del.mock.calls as Array<[string, string?]>;
      const accessTokenDelCalls = delCalls.filter((call) =>
        call[0].startsWith('access:'),
      );
      const refreshTokenDelCalls = delCalls.filter((call) =>
        call[0].startsWith('refresh:'),
      );

      expect(accessTokenDelCalls).toHaveLength(2);
      expect(refreshTokenDelCalls).toHaveLength(1);

      // 사용자 토큰 목록 삭제 확인
      const userTokenListDelCalls = delCalls.filter((call) =>
        call[1] === 'user-tokens',
      );
      expect(userTokenListDelCalls).toHaveLength(2);
    });

    it('[revokeUserTokens] - 빈 토큰 목록 처리', async () => {
      // Arrange
      cacheService.get
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      cacheService.del.mockResolvedValue(undefined);

      // Act
      await tokenService.revokeUserTokens(userId, tenantId);

      // Assert
      // 토큰 메타데이터 삭제는 호출되지 않음 (빈 배열이므로)
      const tokenMetadataDelCalls = (cacheService.del.mock.calls as Array<[string, string?]>).filter(
        (call) => call[1] === 'token',
      );
      expect(tokenMetadataDelCalls).toHaveLength(0);

      // 사용자 토큰 목록은 삭제됨
      expect(cacheService.del).toHaveBeenCalledTimes(2);
    });

    it('[revokeUserTokens] - null 토큰 목록 처리', async () => {
      // Arrange
      cacheService.get
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      cacheService.del.mockResolvedValue(undefined);

      // Act
      await tokenService.revokeUserTokens(userId, tenantId);

      // Assert
      // 토큰 메타데이터 삭제는 호출되지 않음
      const tokenMetadataDelCalls = (cacheService.del.mock.calls as Array<[string, string?]>).filter(
        (call) => call[1] === 'token',
      );
      expect(tokenMetadataDelCalls).toHaveLength(0);

      // 사용자 토큰 목록은 삭제됨
      expect(cacheService.del).toHaveBeenCalledTimes(2);
    });
  });

  describe('parseExpirationToSeconds', () => {
    it('[parseExpirationToSeconds] - 만료 시간 문자열을 올바르게 파싱', async () => {
      // Arrange
      const testCases = [
        { input: '30s', expected: 30 },
        { input: '15m', expected: 900 },
        { input: '1h', expected: 3600 },
        { input: '2h', expected: 7200 },
        { input: '30d', expected: 2592000 },
      ];

      for (const testCase of testCases) {
        configService.get.mockImplementation((key: string) => {
          if (key === ENV_KEY.JWT_SECRET) return jwtSecret;
          if (key === ENV_KEY.JWT_ACCESS_EXPIRATION) return testCase.input;
          if (key === ENV_KEY.JWT_REFRESH_EXPIRATION) return '30d';
          return undefined;
        });

        jwtPort.sign.mockResolvedValue('token');
        cacheService.get.mockResolvedValue(null);
        cacheService.set.mockResolvedValue(undefined);

        // Act
        const result = await tokenService.issueForUser({
          tenantId,
          userId,
        });

        // Assert
        expect(result.expiresIn).toBe(testCase.expected);
      }
    });

    it('[parseExpirationToSeconds] - 잘못된 만료 시간 형식일 때 기본값 1시간 사용', async () => {
      // Arrange
      configService.get.mockImplementation((key: string) => {
        if (key === ENV_KEY.JWT_SECRET) return jwtSecret;
        if (key === ENV_KEY.JWT_ACCESS_EXPIRATION) return 'invalid-format';
        if (key === ENV_KEY.JWT_REFRESH_EXPIRATION) return '30d';
        return undefined;
      });

      jwtPort.sign.mockResolvedValue('token');
      cacheService.get.mockResolvedValue(null);
      cacheService.set.mockResolvedValue(undefined);

      // Act
      const result = await tokenService.issueForUser({
        tenantId,
        userId,
      });

      // Assert
      expect(result.expiresIn).toBe(3600); // 기본값 1시간
    });
  });
});

