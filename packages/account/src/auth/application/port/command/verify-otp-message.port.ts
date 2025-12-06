import { VerifyResult } from "@app/auth/domain/model/vo/verify-result";
import { UserPrincipal } from "@core/auth";
import { Command } from "@nestjs/cqrs";

export class VerifyOtpMessageCommand extends Command<VerifyResult> {

    constructor(
        public readonly user : UserPrincipal,
        public readonly phoneNumber : string,
        public readonly otp : string
    ){
        super()
    }
}