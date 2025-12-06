import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { ConflictException } from "@nestjs/common";
import { SendOptMessageCommand } from '../../port/command/send-otp-message.port';
import { NaverCloudApiPort } from "@app/auth/domain/port/naver-cloud-api.port";
import { OtpRepositoryPort } from "@app/auth/domain/port/otp-repository.port";

@CommandHandler(SendOptMessageCommand)
export class SendOptMessageCommandHandler implements ICommandHandler<SendOptMessageCommand,string> {

    constructor(
        private readonly naverCloudApi : NaverCloudApiPort,
        private readonly otpRepository : OtpRepositoryPort
    ) {}

    async execute(command: SendOptMessageCommand): Promise<string> {
        const { user, phoneNumber } = command;

        // Redis 에 기존 OTP 가 있을 경우 에러
        const existingOtp = await this.otpRepository.exists(
            phoneNumber
        );

        if (existingOtp) {
            throw new ConflictException('이미 발송된 인증번호가 있습니다. 잠시 후 다시 시도해주세요.');
        }

        // 6자리 랜덤 OTP 생성
        const otp = Math.floor(Math.random() * 1000000).toString().padStart(6,'0');

        // SMS 발송
        await this.naverCloudApi.sendSms(phoneNumber, otp);

        // OTP 세팅
        await this.otpRepository.save(user.userId, { phoneNumber, otp } ,300)
        return otp;
    }

}