import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { OtpUsecaseImpl } from '../../../src/application/usecase/impl/otp.usecase.impl';
import { SmsApiPort } from '../../../src/application/port/sms-api.port';
import { OtpRepositoryPort } from '../../../src/application/port/otp-repository.port';
import { UserRepositoryPort } from '../../../src/domain/port/user-repository.port';
import { User } from '../../../src/domain/model/user';

describe('OtpUsecaseImpl (UNIT)', () => {
  let usecase: OtpUsecaseImpl;
  let smsApi: jest.Mocked<SmsApiPort>;
  let otpRepo: jest.Mocked<OtpRepositoryPort>;
  let userRepo: jest.Mocked<UserRepositoryPort>;

  const tenantId = 'test-tenant';
  const phoneNumber = '01012345678';

  beforeEach(() => {
    // Mock 생성
    smsApi = {
      sendSms: jest.fn(),
    } as jest.Mocked<SmsApiPort>;

    otpRepo = {
      saveCode: jest.fn(),
      verifyAndConsume: jest.fn(),
      hasActiveCode: jest.fn(),
    } as jest.Mocked<OtpRepositoryPort>;

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

    // 직접 인스턴스 생성
    usecase = new OtpUsecaseImpl(smsApi, otpRepo, userRepo);
  });

  describe('requestOtp', () => {
    it('should successfully send OTP and update user phone number', async () => {
      // Arrange
      const user = User.create({
        id: 'user-123',
        tenantId,
        username: 'test-user',
        email: 'test@example.com',
      });
      // phoneVerified는 기본적으로 false

      otpRepo.hasActiveCode.mockResolvedValue(false);
      otpRepo.saveCode.mockResolvedValue(undefined);
      smsApi.sendSms.mockResolvedValue(undefined);
      userRepo.update.mockResolvedValue(user);

      // Act
      const result = await usecase.requestOtp({
        user,
        phoneNumber,
      });

      // Assert
      expect(result).toEqual({ sent: true });
      expect(otpRepo.hasActiveCode).toHaveBeenCalledWith(phoneNumber);
      expect(otpRepo.saveCode).toHaveBeenCalledTimes(1);
      expect(otpRepo.saveCode).toHaveBeenCalledWith(
        phoneNumber,
        expect.stringMatching(/^\d{6}$/),
        180,
      );
      expect(smsApi.sendSms).toHaveBeenCalledTimes(1);
      expect(smsApi.sendSms).toHaveBeenCalledWith(
        phoneNumber,
        expect.stringContaining('[개개팅] 인증번호'),
      );
      expect(userRepo.update).toHaveBeenCalledTimes(1);
      expect(user.phone).toBe(phoneNumber);
      expect(user.phoneVerified).toBe(false);
    });

    it('should throw BadRequestException when phone is already verified', async () => {
      // Arrange
      const user = User.create({
        id: 'user-123',
        tenantId,
        username: 'test-user',
        email: 'test@example.com',
      });
      user.updatePhone(phoneNumber);
      user.verifyPhone(); // 이미 인증된 상태

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

      expect(otpRepo.hasActiveCode).not.toHaveBeenCalled();
      expect(otpRepo.saveCode).not.toHaveBeenCalled();
      expect(smsApi.sendSms).not.toHaveBeenCalled();
      expect(userRepo.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when active code exists (TTL not expired)', async () => {
      // Arrange
      const user = User.create({
        id: 'user-123',
        tenantId,
        username: 'test-user',
        email: 'test@example.com',
      });

      otpRepo.hasActiveCode.mockResolvedValue(true);

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

      expect(otpRepo.hasActiveCode).toHaveBeenCalledWith(phoneNumber);
      expect(otpRepo.saveCode).not.toHaveBeenCalled();
      expect(smsApi.sendSms).not.toHaveBeenCalled();
      expect(userRepo.update).not.toHaveBeenCalled();
    });

    it('should throw InternalServerErrorException when SMS sending fails', async () => {
      // Arrange
      const user = User.create({
        id: 'user-123',
        tenantId,
        username: 'test-user',
        email: 'test@example.com',
      });

      otpRepo.hasActiveCode.mockResolvedValue(false);
      otpRepo.saveCode.mockResolvedValue(undefined);
      smsApi.sendSms.mockRejectedValue(new Error('SMS API error'));

      // Act & Assert
      await expect(
        usecase.requestOtp({
          user,
          phoneNumber,
        }),
      ).rejects.toThrow(InternalServerErrorException);

      expect(otpRepo.saveCode).toHaveBeenCalledTimes(1);
      expect(smsApi.sendSms).toHaveBeenCalledTimes(1);
      expect(userRepo.update).not.toHaveBeenCalled();
    });

    it('should update user phone number when sending OTP', async () => {
      // Arrange
      const user = User.create({
        id: 'user-123',
        tenantId,
        username: 'test-user',
        email: 'test@example.com',
      });
      const newPhoneNumber = '01098765432';

      otpRepo.hasActiveCode.mockResolvedValue(false);
      otpRepo.saveCode.mockResolvedValue(undefined);
      smsApi.sendSms.mockResolvedValue(undefined);
      userRepo.update.mockResolvedValue(user);

      // Act
      await usecase.requestOtp({
        user,
        phoneNumber: newPhoneNumber,
      });

      // Assert
      expect(user.phone).toBe(newPhoneNumber);
      expect(userRepo.update).toHaveBeenCalledWith(user);
    });
  });

  describe('verifyOtp', () => {
    it('should successfully verify OTP and update user phone verification status', async () => {
      // Arrange
      const user = User.create({
        id: 'user-123',
        tenantId,
        username: 'test-user',
        email: 'test@example.com',
        phone: phoneNumber,
      });
      const code = '123456';

      otpRepo.verifyAndConsume.mockResolvedValue(true);
      userRepo.update.mockResolvedValue(user);

      // Act
      const result = await usecase.verifyOtp({
        user,
        phoneNumber,
        code,
      });

      // Assert
      expect(result).toEqual({ verified: true });
      expect(otpRepo.verifyAndConsume).toHaveBeenCalledWith(phoneNumber, code);
      expect(user.phoneVerified).toBe(true);
      expect(userRepo.update).toHaveBeenCalledWith(user);
    });

    it('should return verified false when OTP code is invalid', async () => {
      // Arrange
      const user = User.create({
        id: 'user-123',
        tenantId,
        username: 'test-user',
        email: 'test@example.com',
        phone: phoneNumber,
      });
      const code = 'wrong-code';

      otpRepo.verifyAndConsume.mockResolvedValue(false);

      // Act
      const result = await usecase.verifyOtp({
        user,
        phoneNumber,
        code,
      });

      // Assert
      expect(result).toEqual({ verified: false });
      expect(otpRepo.verifyAndConsume).toHaveBeenCalledWith(phoneNumber, code);
      expect(user.phoneVerified).toBe(false);
      expect(userRepo.update).not.toHaveBeenCalled();
    });

    it('should return verified false when OTP code is expired', async () => {
      // Arrange
      const user = User.create({
        id: 'user-123',
        tenantId,
        username: 'test-user',
        email: 'test@example.com',
        phone: phoneNumber,
      });
      const code = '123456';

      otpRepo.verifyAndConsume.mockResolvedValue(false);

      // Act
      const result = await usecase.verifyOtp({
        user,
        phoneNumber,
        code,
      });

      // Assert
      expect(result).toEqual({ verified: false });
      expect(otpRepo.verifyAndConsume).toHaveBeenCalledWith(phoneNumber, code);
      expect(user.phoneVerified).toBe(false);
      expect(userRepo.update).not.toHaveBeenCalled();
    });

    it('should update user phone verification status only when OTP is valid', async () => {
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

      otpRepo.verifyAndConsume.mockResolvedValueOnce(true);
      otpRepo.verifyAndConsume.mockResolvedValueOnce(false);
      userRepo.update.mockResolvedValue(user);

      // Act - Valid code
      const result1 = await usecase.verifyOtp({
        user,
        phoneNumber,
        code: validCode,
      });

      // Assert - Valid code
      expect(result1).toEqual({ verified: true });
      expect(user.phoneVerified).toBe(true);
      expect(userRepo.update).toHaveBeenCalledTimes(1);

      // Reset user state
      user.setPhoneVerified(false);
      userRepo.update.mockClear();

      // Act - Invalid code
      const result2 = await usecase.verifyOtp({
        user,
        phoneNumber,
        code: invalidCode,
      });

      // Assert - Invalid code
      expect(result2).toEqual({ verified: false });
      expect(user.phoneVerified).toBe(false);
      expect(userRepo.update).not.toHaveBeenCalled();
    });
  });
});

