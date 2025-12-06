import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { BadRequestException } from "@nestjs/common";
import { VerifyOtpMessageCommand } from "../../port/command/verify-otp-message.port";
import { VerifyResult } from "@app/auth/domain/model/vo/verify-result";
import { OtpRepositoryPort } from "@app/auth/domain/port/otp-repository.port";
import { EventPublisherPort } from "@app/auth/domain/port/event-publisher.port";
import { Topics } from "@app/common/topic";
import { AccountUserPhoneVerifiedV1Payload } from "@app/common/payload";

@CommandHandler(VerifyOtpMessageCommand)
export class VerifyOtpMessageCommandHandler implements ICommandHandler<VerifyOtpMessageCommand,VerifyResult> {

    private readonly MAX_ATTEMPTS = 5;

    constructor(
        private readonly otpRepository: OtpRepositoryPort,
        private readonly eventPublisher : EventPublisherPort,
    ) {}

    async execute(command: VerifyOtpMessageCommand): Promise<VerifyResult> {
        const { user, phoneNumber, otp } = command;

        // Redis 에서 phoneNumber 로 발급된 OTP 조회
        const savedOtp = await this.otpRepository.get(phoneNumber);

        if (!savedOtp) {
            throw new BadRequestException('인증번호가 만료되었거나 존재하지 않습니다.');
        }

        if (savedOtp !== otp) {
            // 시도가능 횟수 증가
            const attempts = await this.otpRepository.incrementAttempts(phoneNumber);

            if (attempts >= this.MAX_ATTEMPTS) {
                await this.otpRepository.delete(phoneNumber);
                throw new BadRequestException('인증 시도 횟수를 초과했습니다. 다시 인증번호를 요청해주세요.');
            }

            return VerifyResult.fail(this.MAX_ATTEMPTS-attempts);
        }

        // 인증 성공 시 OTP 삭제
        await this.otpRepository.delete(phoneNumber);
        // user 도메인에 휴대폰번호 인증완료 이벤트 전송
        await this.eventPublisher.publish(Topics.ACCOUNT_USER_PHONE_VERIFIED_V1,new AccountUserPhoneVerifiedV1Payload(user.userId,phoneNumber))
        return VerifyResult.success();
    }

}