import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { OtpUsecaseImpl } from '../../../src/application/usecase/impl/otp.usecase.impl';
import { OtpServicePort } from '../../../src/application/port/otp-service.port';
import { UserServicePort } from '../../../src/application/port/user-service.port';
import { TokenServicePort } from '../../../src/application/port/token-service.port';
import { User } from '../../../src/domain/model/user';

describe('OtpUsecaseImpl (UNIT)', () => {
  let usecase: OtpUsecaseImpl;
  let otpService: jest.Mocked<OtpServicePort>;
  let tokenService: jest.Mocked<TokenServicePort>;
  let userService: jest.Mocked<UserServicePort>;

  const tenantId = 'test-tenant';
  const phoneNumber = '01012345678';

  beforeEach(() => {
    // Mock 생성
    otpService = {
      requestOtp: jest.fn(),
      verifyOtp: jest.fn(),
    } as jest.Mocked<OtpServicePort>;

    tokenService = {
      issueForUser: jest.fn(),
      verifyToken: jest.fn(),
      revokeToken: jest.fn(),
      revokeUserTokens: jest.fn(),
    } as jest.Mocked<TokenServicePort>;

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

    // 직접 인스턴스 생성
    usecase = new OtpUsecaseImpl(otpService, tokenService, userService);
  });

  describe('requestOtp', () => {
    it('[requestOtp] - OTP 전송 및 사용자 전화번호 업데이트 성공', async () => {
      // Arrange
      const user = User.create({
        id: 'user-123',
        tenantId,
        username: 'test-user',
        email: 'test@example.com',
      });

      otpService.requestOtp.mockResolvedValue({ sent: true });

      // Act
      const result = await usecase.requestOtp({
        user,
        phoneNumber,
      });

      // Assert
      expect(result).toEqual({ sent: true });
      expect(otpService.requestOtp).toHaveBeenCalledWith({
        user,
        phoneNumber,
      });
    });

    it('[requestOtp] - 이미 인증된 전화번호일 때 BadRequestException 발생', async () => {
      // Arrange
      const user = User.create({
        id: 'user-123',
        tenantId,
        username: 'test-user',
        email: 'test@example.com',
      });
      user.updatePhone(phoneNumber);
      user.verifyPhone(); // 이미 인증된 상태

      otpService.requestOtp.mockRejectedValue(
        new BadRequestException('Phone number 01012345678 is already verified')
      );

      // Act & Assert
      await expect(
        usecase.requestOtp({
          user,
          phoneNumber,
        }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        usecase.requestOtp({
          user,
          phoneNumber,
        }),
      ).rejects.toThrow('Phone number 01012345678 is already verified');
    });

    it('[requestOtp] - 활성화된 코드가 있을 때 BadRequestException 발생', async () => {
      // Arrange
      const user = User.create({
        id: 'user-123',
        tenantId,
        username: 'test-user',
        email: 'test@example.com',
      });

      otpService.requestOtp.mockRejectedValue(
        new BadRequestException('OTP request is not allowed. Please wait 3 minutes before requesting again.')
      );

      // Act & Assert
      await expect(
        usecase.requestOtp({
          user,
          phoneNumber,
        }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        usecase.requestOtp({
          user,
          phoneNumber,
        }),
      ).rejects.toThrow('OTP request is not allowed. Please wait 3 minutes before requesting again.');
    });

    it('[requestOtp] - SMS 전송 실패 시 InternalServerErrorException 발생', async () => {
      // Arrange
      const user = User.create({
        id: 'user-123',
        tenantId,
        username: 'test-user',
        email: 'test@example.com',
      });

      otpService.requestOtp.mockRejectedValue(
        new InternalServerErrorException('SMS API error')
      );

      // Act & Assert
      await expect(
        usecase.requestOtp({
          user,
          phoneNumber,
        }),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('[requestOtp] - OTP 전송 시 사용자 전화번호 업데이트', async () => {
      // Arrange
      const user = User.create({
        id: 'user-123',
        tenantId,
        username: 'test-user',
        email: 'test@example.com',
      });
      const newPhoneNumber = '01098765432';

      otpService.requestOtp.mockResolvedValue({ sent: true });

      // Act
      await usecase.requestOtp({
        user,
        phoneNumber: newPhoneNumber,
      });

      // Assert
      expect(otpService.requestOtp).toHaveBeenCalledWith({
        user,
        phoneNumber: newPhoneNumber,
      });
    });
  });

  describe('verifyOtp', () => {
    it('[verifyOtp] - OTP 검증 성공 및 사용자 전화번호 인증 상태 업데이트', async () => {
      // Arrange
      const user = User.create({
        id: 'user-123',
        tenantId,
        username: 'test-user',
        email: 'test@example.com',
        phone: phoneNumber,
      });
      const code = '123456';
      const mockAuthPayload = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 3600,
      };

      otpService.verifyOtp.mockResolvedValue({
        verified: true,
        phoneVerified: true,
      });
      userService.getUserRolesAndPermissions.mockResolvedValue({
        roles: ['user'],
        permissions: ['read'],
      });
      tokenService.issueForUser.mockResolvedValue(mockAuthPayload);

      // Act
      const result = await usecase.verifyOtp({
        user,
        phoneNumber,
        code,
      });

      // Assert
      expect(result).toEqual({
        verified: true,
        payload: mockAuthPayload,
      });
      expect(otpService.verifyOtp).toHaveBeenCalledWith({
        user,
        phoneNumber,
        code,
      });
      expect(userService.getUserRolesAndPermissions).toHaveBeenCalledWith(user.id);
      expect(tokenService.issueForUser).toHaveBeenCalledWith({
        userId: user.id,
        tenantId: user.tenantId,
        phoneVerified: true,
        emailVerified: user.emailVerified,
        roles: ['user'],
        permissions: ['read'],
      });
    });

    it('[verifyOtp] - 잘못된 OTP 코드일 때 verified false 반환', async () => {
      // Arrange
      const user = User.create({
        id: 'user-123',
        tenantId,
        username: 'test-user',
        email: 'test@example.com',
        phone: phoneNumber,
      });
      const code = 'wrong-code';

      otpService.verifyOtp.mockResolvedValue({
        verified: false,
      });

      // Act
      const result = await usecase.verifyOtp({
        user,
        phoneNumber,
        code,
      });

      // Assert
      expect(result).toEqual({ verified: false });
      expect(otpService.verifyOtp).toHaveBeenCalledWith({
        user,
        phoneNumber,
        code,
      });
    });

    it('[verifyOtp] - 만료된 OTP 코드일 때 verified false 반환', async () => {
      // Arrange
      const user = User.create({
        id: 'user-123',
        tenantId,
        username: 'test-user',
        email: 'test@example.com',
        phone: phoneNumber,
      });
      const code = '123456';

      otpService.verifyOtp.mockResolvedValue({
        verified: false,
      });

      // Act
      const result = await usecase.verifyOtp({
        user,
        phoneNumber,
        code,
      });

      // Assert
      expect(result).toEqual({ verified: false });
      expect(otpService.verifyOtp).toHaveBeenCalledWith({
        user,
        phoneNumber,
        code,
      });
    });

    it('[verifyOtp] - 유효한 OTP일 때만 토큰 발급 및 사용자 전화번호 인증 상태 업데이트', async () => {
      // Arrange
      const user = User.create({
        id: 'user-123',
        tenantId,
        username: 'test-user',
        email: 'test@example.com',
        phone: phoneNumber,
      });
      const validCode = '123456';
      const invalidCode = '000000';
      const mockAuthPayload = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 3600,
      };

      otpService.verifyOtp.mockResolvedValueOnce({
        verified: true,
        phoneVerified: true,
      });
      otpService.verifyOtp.mockResolvedValueOnce({
        verified: false,
      });
      userService.getUserRolesAndPermissions.mockResolvedValue({
        roles: ['user'],
        permissions: ['read'],
      });
      tokenService.issueForUser.mockResolvedValue(mockAuthPayload);

      // Act - Valid code
      const result1 = await usecase.verifyOtp({
        user,
        phoneNumber,
        code: validCode,
      });

      // Assert - Valid code
      expect(result1).toEqual({
        verified: true,
        payload: mockAuthPayload,
      });
      expect(otpService.verifyOtp).toHaveBeenCalledWith({
        user,
        phoneNumber,
        code: validCode,
      });
      expect(userService.getUserRolesAndPermissions).toHaveBeenCalledWith(user.id);
      expect(tokenService.issueForUser).toHaveBeenCalledWith({
        userId: user.id,
        tenantId: user.tenantId,
        phoneVerified: true,
        emailVerified: user.emailVerified,
        roles: ['user'],
        permissions: ['read'],
      });

      // Act - Invalid code
      const result2 = await usecase.verifyOtp({
        user,
        phoneNumber,
        code: invalidCode,
      });

      // Assert - Invalid code
      expect(result2).toEqual({ verified: false });
      expect(otpService.verifyOtp).toHaveBeenCalledWith({
        user,
        phoneNumber,
        code: invalidCode,
      });
      expect(userService.getUserRolesAndPermissions).toHaveBeenCalledTimes(1); // valid code에서만 호출됨
      expect(tokenService.issueForUser).toHaveBeenCalledTimes(1); // valid code에서만 호출됨
    });
  });
});

