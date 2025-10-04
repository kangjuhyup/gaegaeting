import { VerifyOtpMessageCommandHandler } from '../verify-otp-message.command';
import { VerifyOtpMessageCommand } from '@app/auth/application/port/command/verify-otp-message.port';
import { BadRequestException } from '@nestjs/common';
import { UserPrincipal } from '@core/auth';
import { VerifyResult } from '@app/auth/domain/model/vo/verify-result';

describe('VerifyOtpMessageCommandHandler 단위 테스트', () => {
    let handler: VerifyOtpMessageCommandHandler;
    let mockOtpRepository: any;
    let mockEventPublisher: any;

    const mockUser: UserPrincipal = {
        userId: 'test-user-id',
        name: 'test',
        nickname: 'test',
        birth: '1990-01-01',
        region: 1
    };

    const phoneNumber = '01012345678';
    const correctOtp = '123456';

    beforeEach(() => {
        jest.clearAllMocks();

        mockOtpRepository = {
            exists: jest.fn(),
            save: jest.fn(),
            get: jest.fn(),
            delete: jest.fn().mockResolvedValue(undefined),
            incrementAttempts: jest.fn(),
            getAttempts: jest.fn()
        };

        mockEventPublisher = {
            publish: jest.fn().mockResolvedValue(undefined)
        };

        handler = new VerifyOtpMessageCommandHandler(
            mockOtpRepository,
            mockEventPublisher
        );
    });

    it('저장된 OTP가 없을 경우 BadRequestException을 던진다', async () => {
        // Given
        mockOtpRepository.get.mockResolvedValue(null);

        // When & Then
        await expect(
            handler.execute(new VerifyOtpMessageCommand(mockUser, phoneNumber, correctOtp))
        ).rejects.toThrow(BadRequestException);

        expect(mockOtpRepository.get).toHaveBeenCalledWith(phoneNumber);
    });

    it('OTP가 일치하지 않을 경우 VerifyResult.fail을 반환하고 시도 횟수를 증가시킨다', async () => {
        // Given
        mockOtpRepository.get.mockResolvedValue(correctOtp);
        mockOtpRepository.incrementAttempts.mockResolvedValue(1);

        // When
        const result = await handler.execute(
            new VerifyOtpMessageCommand(mockUser, phoneNumber, 'wrong-otp')
        );

        // Then
        expect(result.success).toBe(false);
        expect(result.remainingAttempts).toBe(4); // MAX_ATTEMPTS(5) - 1
        expect(mockOtpRepository.incrementAttempts).toHaveBeenCalledWith(phoneNumber);
        expect(mockOtpRepository.delete).not.toHaveBeenCalled();
        expect(mockEventPublisher.publish).not.toHaveBeenCalled();
    });

    it('OTP 불일치 시도가 5번을 초과하면 OTP를 삭제하고 BadRequestException을 던진다', async () => {
        // Given
        mockOtpRepository.get.mockResolvedValue(correctOtp);
        mockOtpRepository.incrementAttempts.mockResolvedValue(5);

        // When & Then
        await expect(
            handler.execute(new VerifyOtpMessageCommand(mockUser, phoneNumber, 'wrong-otp'))
        ).rejects.toThrow(BadRequestException);

        expect(mockOtpRepository.incrementAttempts).toHaveBeenCalledWith(phoneNumber);
        expect(mockOtpRepository.delete).toHaveBeenCalledWith(phoneNumber);
        expect(mockEventPublisher.publish).not.toHaveBeenCalled();
    });

    it('OTP가 일치하면 VerifyResult.success를 반환하고 OTP를 삭제하며 이벤트를 발행한다', async () => {
        // Given
        mockOtpRepository.get.mockResolvedValue(correctOtp);

        // When
        const result = await handler.execute(
            new VerifyOtpMessageCommand(mockUser, phoneNumber, correctOtp)
        );

        // Then
        expect(result.success).toBe(true);
        expect(mockOtpRepository.delete).toHaveBeenCalledWith(phoneNumber);
        expect(mockEventPublisher.publish).toHaveBeenCalledWith(
            'account.user.phone_verified.v1',
            expect.objectContaining({
                userId: mockUser.userId,
                phoneNumber
            })
        );
    });

    it('OTP 불일치 시 남은 시도 횟수가 정확히 계산된다', async () => {
        // Given
        mockOtpRepository.get.mockResolvedValue(correctOtp);
        mockOtpRepository.incrementAttempts.mockResolvedValue(3);

        // When
        const result = await handler.execute(
            new VerifyOtpMessageCommand(mockUser, phoneNumber, 'wrong-otp')
        );

        // Then
        expect(result.remainingAttempts).toBe(2); // MAX_ATTEMPTS(5) - 3
    });
});
