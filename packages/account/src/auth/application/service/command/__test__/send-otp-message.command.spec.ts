import { SendOptMessageCommandHandler } from '../send-otp-message.command';
import { SendOptMessageCommand } from '@app/auth/application/port/command/send-otp-message.port';
import { ConflictException } from '@nestjs/common';
import { UserPrincipal } from '@core/auth';

describe('SendOptMessageCommandHandler 단위 테스트', () => {
    let handler: SendOptMessageCommandHandler;
    let mockNaverCloudApi: any;
    let mockOtpRepository: any;

    const mockUser: UserPrincipal = {
        userId: 'test-user-id',
        name: 'test',
        nickname: 'test',
        birth: '1990-01-01',
        region: 1
    };

    const phoneNumber = '01012345678';

    beforeEach(() => {
        jest.clearAllMocks();

        mockNaverCloudApi = {
            sendSms: jest.fn().mockResolvedValue(undefined)
        };

        mockOtpRepository = {
            exists: jest.fn(),
            save: jest.fn().mockResolvedValue(undefined),
            get: jest.fn(),
            delete: jest.fn(),
            incrementAttempts: jest.fn(),
            getAttempts: jest.fn()
        };

        handler = new SendOptMessageCommandHandler(
            mockNaverCloudApi,
            mockOtpRepository
        );
    });

    it('이미 발송된 OTP가 있을 경우 ConflictException을 던진다', async () => {
        // Given
        mockOtpRepository.exists.mockResolvedValue(true);

        // When & Then
        await expect(
            handler.execute(new SendOptMessageCommand(mockUser, phoneNumber))
        ).rejects.toThrow(ConflictException);

        expect(mockNaverCloudApi.sendSms).not.toHaveBeenCalled();
        expect(mockOtpRepository.save).not.toHaveBeenCalled();
    });

    it('OTP가 없을 경우 6자리 OTP를 생성하고 SMS를 발송한다', async () => {
        // Given
        mockOtpRepository.exists.mockResolvedValue(false);

        // When
        const result = await handler.execute(new SendOptMessageCommand(mockUser, phoneNumber));

        // Then
        expect(result).toHaveLength(6);
        expect(result).toMatch(/^\d{6}$/);
        expect(mockOtpRepository.exists).toHaveBeenCalledWith(phoneNumber);
        expect(mockNaverCloudApi.sendSms).toHaveBeenCalledWith(phoneNumber, result);
        expect(mockOtpRepository.save).toHaveBeenCalledWith(
            mockUser.userId,
            { phoneNumber, otp: result },
            300
        );
    });

    it('생성된 OTP는 0으로 시작할 수 있다 (6자리 패딩)', async () => {
        // Given
        mockOtpRepository.exists.mockResolvedValue(false);
        jest.spyOn(Math, 'random').mockReturnValue(0.0001); // 100이 나오도록

        // When
        const result = await handler.execute(new SendOptMessageCommand(mockUser, phoneNumber));

        // Then
        expect(result).toBe('000100');
        expect(mockNaverCloudApi.sendSms).toHaveBeenCalledWith(phoneNumber, '000100');
    });
});
