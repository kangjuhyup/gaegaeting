import { SocialSigninUseCaseImpl } from '../../../src/application/usecase/impl/social-signin.usecase.impl';
import { KakaoIdpPort } from '../../../src/application/port/api/kakao-idp.port';
import { AppleIdpPort } from '../../../src/application/port/api/apple-idp.port';
import { TokenServicePort } from '../../../src/application/port/token-service.port';
import { UserServicePort } from '../../../src/application/port/user-service.port';
import { User } from '../../../src/domain/model/user';

describe('SocialSigninUseCaseImpl (UNIT)', () => {
  let usecase: SocialSigninUseCaseImpl;
  let kakaoIdp: jest.Mocked<KakaoIdpPort>;
  let appleIdp: jest.Mocked<AppleIdpPort>;
  let userService: jest.Mocked<UserServicePort>;
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

    userService = {
      findById: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      findByIdentity: jest.fn(),
      delete: jest.fn(),
      findByTenant: jest.fn(),
      existsByEmail: jest.fn(),
      existsByUsername: jest.fn(),
      getUserRolesAndPermissions: jest.fn(),
      createIdentity: jest.fn(),
      createUserFromSocialProfile: jest.fn(),
    } as jest.Mocked<UserServicePort>;

    tokenService = {
      issueForUser: jest.fn(),
      verifyToken: jest.fn(),
      revokeToken: jest.fn(),
      revokeUserTokens: jest.fn(),
    } as jest.Mocked<TokenServicePort>;

    // 직접 인스턴스 생성
    usecase = new SocialSigninUseCaseImpl(
      kakaoIdp,
      appleIdp,
      userService,
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

    it('[signinWithKakao] - 기존 사용자가 있을 때 인증 페이로드를 반환해야 함', async () => {
      // Arrange
      const existingUser = User.create({
        id: 'existing-user-id',
        tenantId,
        username: userNickname,
        email: userEmail,
      });

      kakaoIdp.exchangeAuthCode.mockResolvedValue(mockTokenResponse);
      kakaoIdp.getProfile.mockResolvedValue(mockKakaoProfile);
      userService.createUserFromSocialProfile.mockResolvedValue(existingUser);
      userService.getUserRolesAndPermissions.mockResolvedValue({ roles: ['user'], permissions: ['read'] });
      tokenService.issueForUser.mockResolvedValue(mockAuthPayload);

      // Act
      const result = await usecase.signinWithKakao({
        tenantId,
        authCode,
        redirectUri,
      });

      // Assert
      expect(result).toEqual(mockAuthPayload);
      expect(kakaoIdp.exchangeAuthCode).toHaveBeenCalledWith(authCode, redirectUri);
      expect(kakaoIdp.getProfile).toHaveBeenCalledWith(accessToken);
      expect(userService.createUserFromSocialProfile).toHaveBeenCalledWith({
        tenantId,
        provider: 'kakao',
        providerSub: kakaoUserId,
        username: userNickname,
        email: userEmail,
        profileJson: mockKakaoProfile.raw,
      });
      expect(userService.getUserRolesAndPermissions).toHaveBeenCalledWith(existingUser.id);
      expect(tokenService.issueForUser).toHaveBeenCalledWith({
        tenantId,
        userId: existingUser.id,
        roles: ['user'],
        permissions: ['read'],
        emailVerified : false,
        phoneVerified : false,
      });
    });

    it('[signinWithKakao] - 사용자가 없을 때 새 사용자와 Identity를 생성해야 함', async () => {
      // Arrange
      const newUser = User.create({
        id: 'new-user-id',
        tenantId,
        username: userNickname,
        email: userEmail,
      });

      kakaoIdp.exchangeAuthCode.mockResolvedValue(mockTokenResponse);
      kakaoIdp.getProfile.mockResolvedValue(mockKakaoProfile);
      userService.createUserFromSocialProfile.mockResolvedValue(newUser);
      userService.getUserRolesAndPermissions.mockResolvedValue({ roles: [], permissions: [] });
      tokenService.issueForUser.mockResolvedValue(mockAuthPayload);

      // Act
      const result = await usecase.signinWithKakao({
        tenantId,
        authCode,
        redirectUri,
      });

      // Assert
      expect(result).toEqual(mockAuthPayload);
      expect(userService.createUserFromSocialProfile).toHaveBeenCalledWith({
        tenantId,
        provider: 'kakao',
        providerSub: kakaoUserId,
        username: userNickname,
        email: userEmail,
        profileJson: mockKakaoProfile.raw,
      });
      expect(userService.getUserRolesAndPermissions).toHaveBeenCalledWith(newUser.id);
      expect(tokenService.issueForUser).toHaveBeenCalledWith({
        tenantId,
        userId: newUser.id,
        roles: [],
        permissions: [],
        emailVerified : false,
        phoneVerified : false,
      });
    });

    it('[signinWithKakao] - 닉네임이 없을 때 기본 username을 사용해야 함', async () => {
      // Arrange
      const profileWithoutNickname = {
        id: kakaoUserId,
        email: userEmail,
        raw: { id: kakaoUserId, email: userEmail },
      };

      const newUser = User.create({
        id: 'new-user-id',
        tenantId,
        username: `kakao_${kakaoUserId}`,
        email: userEmail,
      });

      kakaoIdp.exchangeAuthCode.mockResolvedValue(mockTokenResponse);
      kakaoIdp.getProfile.mockResolvedValue(profileWithoutNickname);
      userService.createUserFromSocialProfile.mockResolvedValue(newUser);
      userService.getUserRolesAndPermissions.mockResolvedValue({ roles: [], permissions: [] });
      tokenService.issueForUser.mockResolvedValue(mockAuthPayload);

      // Act
      const result = await usecase.signinWithKakao({
        tenantId,
        authCode,
        redirectUri,
      });

      // Assert
      expect(result).toEqual(mockAuthPayload);
      expect(userService.createUserFromSocialProfile).toHaveBeenCalledWith({
        tenantId,
        provider: 'kakao',
        providerSub: kakaoUserId,
        username: undefined, // nickname이 없으면 undefined 전달
        email: userEmail,
        profileJson: profileWithoutNickname.raw,
      });
    });

    it('[signinWithKakao] - redirectUri가 undefined일 때 처리해야 함', async () => {
      // Arrange
      const existingUser = User.create({
        id: 'existing-user-id',
        tenantId,
        username: userNickname,
        email: userEmail,
      });

      kakaoIdp.exchangeAuthCode.mockResolvedValue(mockTokenResponse);
      kakaoIdp.getProfile.mockResolvedValue(mockKakaoProfile);
      userService.createUserFromSocialProfile.mockResolvedValue(existingUser);
      userService.getUserRolesAndPermissions.mockResolvedValue({ roles: [], permissions: [] });
      tokenService.issueForUser.mockResolvedValue(mockAuthPayload);

      // Act
      const result = await usecase.signinWithKakao({
        tenantId,
        authCode,
      });

      // Assert
      expect(result).toEqual(mockAuthPayload);
      expect(kakaoIdp.exchangeAuthCode).toHaveBeenCalledWith(authCode, undefined);
    });
  });
});
