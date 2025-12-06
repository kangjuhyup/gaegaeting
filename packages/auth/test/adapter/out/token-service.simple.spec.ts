import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { CacheService } from '@core/redis';
import { SimpleTokenService } from '../../../src/adapter/out/jwt-service.adapter';
import { ENV_KEY } from '../../../src/common/config/env.config';
import { TokenMetadata } from '../../../src/application/port/token-service.port';

describe('SimpleTokenService (UNIT)', () => {
  let tokenService: SimpleTokenService;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;
  let cacheService: jest.Mocked<CacheService>;

  const tenantId = 'test-tenant';
  const userId = 'user-123';
  const jwtSecret = 'test-secret';
  const accessExpiration = '1h';
  const refreshExpiration = '30d';

  beforeEach(() => {
    // Mock 생성
    jwtService = {
      signAsync: jest.fn(),
      verifyAsync: jest.fn(),
    } as any;

    configService = {
      get: jest.fn(),
    } as any;

    cacheService = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    } as any;

    // ConfigService 기본값 설정
    configService.get.mockImplementation((key: string) => {
      if (key === ENV_KEY.JWT_SECRET) return jwtSecret;
      if (key === ENV_KEY.JWT_ACCESS_EXPIRATION) return accessExpiration;
      if (key === ENV_KEY.JWT_REFRESH_EXPIRATION) return refreshExpiration;
      return undefined;
    });

    // 직접 인스턴스 생성
    tokenService = new SimpleTokenService(jwtService, configService, cacheService);
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

      jwtService.signAsync
        .mockResolvedValueOnce(mockAccessToken)
        .mockResolvedValueOnce(mockRefreshToken);

      cacheService.get.mockResolvedValue(null); // 사용자별 토큰 목록이 비어있음
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
      expect(jwtService.signAsync).toHaveBeenCalledTimes(2);
      expect(jwtService.signAsync).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          sub: userId,
          tenantId,
          iat: expect.any(Number),
        }),
        {
          secret: jwtSecret,
          expiresIn: accessExpiresIn,
        },
      );
      expect(jwtService.signAsync).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          sub: userId,
          tenantId,
          iat: expect.any(Number),
          type: 'refresh',
        }),
        {
          secret: jwtSecret,
          expiresIn: refreshExpiresIn,
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

    it('should throw error when JWT_SECRET is not configured', async () => {
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

    it('should add tokens to user token list', async () => {
      // Arrange
      const mockAccessToken = 'access-token-123';
      const mockRefreshToken = 'refresh-token-456';

      jwtService.signAsync
        .mockResolvedValueOnce(mockAccessToken)
        .mockResolvedValueOnce(mockRefreshToken);

      cacheService.get.mockResolvedValue(null); // 기존 토큰 목록 없음
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

    it('should append to existing user token list', async () => {
      // Arrange
      const mockAccessToken = 'access-token-123';
      const mockRefreshToken = 'refresh-token-456';
      const existingTokens = ['existing-token-1'];

      jwtService.signAsync
        .mockResolvedValueOnce(mockAccessToken)
        .mockResolvedValueOnce(mockRefreshToken);

      cacheService.get
        .mockResolvedValueOnce(null) // 토큰 메타데이터 조회 (access)
        .mockResolvedValueOnce(null) // 토큰 메타데이터 조회 (refresh)
        .mockResolvedValueOnce(existingTokens) // 기존 access token 목록
        .mockResolvedValueOnce([]); // 기존 refresh token 목록 (비어있음)

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
      const accessTokenListCall = userTokenListCalls.find((call) =>
        call[0].includes(':access'),
      );
      expect(accessTokenListCall![1]).toEqual([...existingTokens, mockAccessToken]);
    });
  });

  describe('verifyToken', () => {
    it('should return token metadata when token is valid and exists in Redis', async () => {
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

      jwtService.verifyAsync.mockResolvedValue(decoded);
      cacheService.get.mockResolvedValue(metadata);

      // Act
      const result = await tokenService.verifyToken(token);

      // Assert
      expect(result).toEqual(metadata);
      expect(jwtService.verifyAsync).toHaveBeenCalledWith(token, {
        secret: jwtSecret,
      });
      expect(cacheService.get).toHaveBeenCalledWith(
        expect.stringMatching(/^access:/),
        'token',
      );
    });

    it('should return null when token is invalid', async () => {
      // Arrange
      const token = 'invalid-token';

      jwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));

      // Act
      const result = await tokenService.verifyToken(token);

      // Assert
      expect(result).toBeNull();
      expect(cacheService.get).not.toHaveBeenCalled();
    });

    it('should return null when token does not exist in Redis', async () => {
      // Arrange
      const token = 'valid-token-but-not-in-redis';
      const decoded = {
        sub: userId,
        tenantId,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      jwtService.verifyAsync.mockResolvedValue(decoded);
      cacheService.get.mockResolvedValue(null); // Redis에 없음

      // Act
      const result = await tokenService.verifyToken(token);

      // Assert
      expect(result).toBeNull();
      expect(cacheService.get).toHaveBeenCalled();
    });

    it('should return null when JWT_SECRET is not configured', async () => {
      // Arrange
      const token = 'valid-token';
      configService.get.mockReturnValue(undefined);

      // Act
      const result = await tokenService.verifyToken(token);

      // Assert
      expect(result).toBeNull();
      expect(jwtService.verifyAsync).not.toHaveBeenCalled();
    });

    it('should handle refresh token type', async () => {
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

      jwtService.verifyAsync.mockResolvedValue(decoded);
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
    it('should delete token from Redis', async () => {
      // Arrange
      const token = 'token-to-revoke';
      const decoded = {
        sub: userId,
        tenantId,
        type: 'access',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      jwtService.verifyAsync.mockResolvedValue(decoded);
      cacheService.get.mockResolvedValue(['token-to-revoke', 'other-token']);
      cacheService.del.mockResolvedValue(undefined);
      cacheService.set.mockResolvedValue(undefined);

      // Act
      await tokenService.revokeToken(token);

      // Assert
      expect(jwtService.verifyAsync).toHaveBeenCalledWith(token, {
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

    it('should delete user token list when it becomes empty', async () => {
      // Arrange
      const token = 'last-token';
      const decoded = {
        sub: userId,
        tenantId,
        type: 'access',
      };

      jwtService.verifyAsync.mockResolvedValue(decoded);
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

    it('should handle invalid token gracefully', async () => {
      // Arrange
      const token = 'invalid-token';

      jwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));

      // Act & Assert (should not throw)
      await expect(tokenService.revokeToken(token)).resolves.not.toThrow();
      expect(cacheService.del).not.toHaveBeenCalled();
    });

    it('should handle missing JWT_SECRET gracefully', async () => {
      // Arrange
      const token = 'valid-token';
      configService.get.mockReturnValue(undefined);

      // Act & Assert
      await expect(tokenService.revokeToken(token)).resolves.not.toThrow();
      expect(jwtService.verifyAsync).not.toHaveBeenCalled();
    });
  });

  describe('revokeUserTokens', () => {
    it('should revoke all tokens for a user', async () => {
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
      expect(cacheService.del).toHaveBeenCalledTimes(4); // access 2개 + refresh 1개 + 사용자 토큰 목록 2개

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

    it('should handle empty token lists', async () => {
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

    it('should handle null token lists', async () => {
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
    it('should parse expiration strings correctly', async () => {
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

        jwtService.signAsync.mockResolvedValue('token');
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

    it('should default to 1 hour for invalid expiration format', async () => {
      // Arrange
      configService.get.mockImplementation((key: string) => {
        if (key === ENV_KEY.JWT_SECRET) return jwtSecret;
        if (key === ENV_KEY.JWT_ACCESS_EXPIRATION) return 'invalid-format';
        if (key === ENV_KEY.JWT_REFRESH_EXPIRATION) return '30d';
        return undefined;
      });

      jwtService.signAsync.mockResolvedValue('token');
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

