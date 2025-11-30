import { SocialSigninUseCaseImpl } from '../../../src/application/usecase/impl/social-signin.usecase.impl';
import { KakaoIdpPort } from '../../../src/application/port/kakao-idp.port';
import { AppleIdpPort } from '../../../src/application/port/apple-idp.port';
import { TokenServicePort } from '../../../src/application/port/token-service.port';
import { UserRepositoryPort } from '../../../src/domain/port/user-repository.port';
import { UserIdentityRepositoryPort } from '../../../src/domain/port/user-identity-repository.port';
import { User } from '../../../src/domain/model/user';

describe('SocialSigninUseCaseImpl (UNIT)', () => {
  let usecase: SocialSigninUseCaseImpl;
  let kakaoIdp: jest.Mocked<KakaoIdpPort>;
  let appleIdp: jest.Mocked<AppleIdpPort>;
  let userRepo: jest.Mocked<UserRepositoryPort>;
  let identityRepo: jest.Mocked<UserIdentityRepositoryPort>;
  let tokenService: jest.Mocked<TokenServicePort>;

  beforeEach(() => {
    // Mock 생성
    kakaoIdp = {
      exchangeAuthCode: jest.fn(),
      getProfile: jest.fn(),
    } as jest.Mocked<KakaoIdpPort>;

    appleIdp = {
      verifyIdToken: jest.fn(),
    } as jest.Mocked<AppleIdpPort>;

    userRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findByTenant: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      existsByEmail: jest.fn(),
      existsByUsername: jest.fn(),
      findByIdentity: jest.fn(),
      findByPhone: jest.fn(),
    } as jest.Mocked<UserRepositoryPort>;

    identityRepo = {
      create: jest.fn(),
    } as jest.Mocked<UserIdentityRepositoryPort>;

    tokenService = {
      issueForUser: jest.fn(),
    } as jest.Mocked<TokenServicePort>;

    // 직접 인스턴스 생성
    usecase = new SocialSigninUseCaseImpl(
      kakaoIdp,
      appleIdp,
      userRepo,
      identityRepo,
      tokenService,
    );
  });

  describe('signinWithKakao', () => {
    const tenantId = 'test-tenant';
    const authCode = 'test-auth-code';
    const redirectUri = 'https://test.com/callback';
    const accessToken = 'test-access-token';
    const kakaoUserId = 'kakao-user-id';
    const userEmail = 'test@example.com';
    const userNickname = 'test-nickname';

    const mockTokenResponse = {
      accessToken,
      refreshToken: 'test-refresh-token',
      expiresIn: 3600,
    };

    const mockKakaoProfile = {
      id: kakaoUserId,
      email: userEmail,
      nickname: userNickname,
      raw: { id: kakaoUserId, email: userEmail, nickname: userNickname },
    };

    const mockAuthPayload = {
      accessToken: 'jwt-access-token',
      refreshToken: 'jwt-refresh-token',
      expiresIn: 900,
    };

    it('should return auth payload for existing user', async () => {
      // Arrange
      const existingUser = User.create({
        id: 'existing-user-id',
        tenantId,
        username: userNickname,
        email: userEmail,
      });

      kakaoIdp.exchangeAuthCode.mockResolvedValue(mockTokenResponse);
      kakaoIdp.getProfile.mockResolvedValue(mockKakaoProfile);
      userRepo.findByIdentity.mockResolvedValue(existingUser);
      tokenService.issueForUser.mockResolvedValue(mockAuthPayload);

      // Act
      const result = await usecase.signinWithKakao({
        tenantId,
        authCode,
        redirectUri,
      });

      // Assert
      expect(result).toEqual(mockAuthPayload);
      expect(kakaoIdp.exchangeAuthCode).toHaveBeenCalledWith(tenantId, authCode, redirectUri);
      expect(kakaoIdp.getProfile).toHaveBeenCalledWith(accessToken);
      expect(userRepo.findByIdentity).toHaveBeenCalledWith(tenantId, 'kakao', kakaoUserId);
      expect(tokenService.issueForUser).toHaveBeenCalledWith({ tenantId, userId: existingUser.id });
      expect(userRepo.create).not.toHaveBeenCalled();
      expect(identityRepo.create).not.toHaveBeenCalled();
    });

    it('should create new user and identity when user does not exist', async () => {
      // Arrange
      kakaoIdp.exchangeAuthCode.mockResolvedValue(mockTokenResponse);
      kakaoIdp.getProfile.mockResolvedValue(mockKakaoProfile);
      userRepo.findByIdentity.mockResolvedValue(null);
      
      // 새로 생성될 사용자
      const newUser = User.create({
        id: 'new-user-id',
        tenantId,
        username: userNickname,
        email: userEmail,
      });

      userRepo.create.mockResolvedValue(newUser);
      identityRepo.create.mockResolvedValue(undefined as any);
      tokenService.issueForUser.mockResolvedValue(mockAuthPayload);

      // Act
      const result = await usecase.signinWithKakao({
        tenantId,
        authCode,
        redirectUri,
      });

      // Assert
      expect(result).toEqual(mockAuthPayload);
      expect(kakaoIdp.exchangeAuthCode).toHaveBeenCalledWith(tenantId, authCode, redirectUri);
      expect(kakaoIdp.getProfile).toHaveBeenCalledWith(accessToken);
      expect(userRepo.findByIdentity).toHaveBeenCalledWith(tenantId, 'kakao', kakaoUserId);
      expect(userRepo.create).toHaveBeenCalledTimes(1);
      expect(identityRepo.create).toHaveBeenCalledWith({
        tenantId,
        userId: newUser.id,
        provider: 'kakao',
        providerSub: kakaoUserId,
        email: userEmail,
        profileJson: mockKakaoProfile.raw,
      });
      expect(tokenService.issueForUser).toHaveBeenCalledWith({ tenantId, userId: newUser.id });
    });

    it('should use default username when nickname is not provided', async () => {
      // Arrange
      const profileWithoutNickname = {
        id: kakaoUserId,
        email: userEmail,
        raw: { id: kakaoUserId, email: userEmail },
      };

      kakaoIdp.exchangeAuthCode.mockResolvedValue(mockTokenResponse);
      kakaoIdp.getProfile.mockResolvedValue(profileWithoutNickname);
      userRepo.findByIdentity.mockResolvedValue(null);
      
      const newUser = User.create({
        id: 'new-user-id',
        tenantId,
        username: `kakao_${kakaoUserId}`,
        email: userEmail,
      });

      userRepo.create.mockResolvedValue(newUser);
      identityRepo.create.mockResolvedValue(undefined as any);
      tokenService.issueForUser.mockResolvedValue(mockAuthPayload);

      // Act
      const result = await usecase.signinWithKakao({
        tenantId,
        authCode,
        redirectUri,
      });

      // Assert
      expect(result).toEqual(mockAuthPayload);
      expect(userRepo.create).toHaveBeenCalledTimes(1);
      const createCall = userRepo.create.mock.calls[0][0];
      expect(createCall.username).toBe(`kakao_${kakaoUserId}`);
    });

    it('should handle redirectUri being undefined', async () => {
      // Arrange
      const existingUser = User.create({
        id: 'existing-user-id',
        tenantId,
        username: userNickname,
        email: userEmail,
      });

      kakaoIdp.exchangeAuthCode.mockResolvedValue(mockTokenResponse);
      kakaoIdp.getProfile.mockResolvedValue(mockKakaoProfile);
      userRepo.findByIdentity.mockResolvedValue(existingUser);
      tokenService.issueForUser.mockResolvedValue(mockAuthPayload);

      // Act
      const result = await usecase.signinWithKakao({
        tenantId,
        authCode,
      });

      // Assert
      expect(result).toEqual(mockAuthPayload);
      expect(kakaoIdp.exchangeAuthCode).toHaveBeenCalledWith(tenantId, authCode, undefined);
    });
  });
});
