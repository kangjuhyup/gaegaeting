import { VerifyResult } from "@app/auth/domain/model/vo/verify-result";
import { Command } from "@nestjs/cqrs";

export class VerifyOtpMessageCommand extends Command<VerifyResult> {

    constructor(
        public readonly phoneNumber : string,
        public readonly otp : string
    ){
        super()
    }
}