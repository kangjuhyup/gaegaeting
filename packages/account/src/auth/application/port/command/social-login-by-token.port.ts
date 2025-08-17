import { AuthEntity } from "@app/auth/domain/model/auth";
import { AuthToken } from '../../../domain/model/auth-token';
import { Command } from "@nestjs/cqrs";
import { AuthProvider } from "@core/auth";

export class SocialLoginByTokenCommand extends Command<AuthEntity> {

    constructor(
        public readonly provider : AuthProvider,
        public readonly authToken : AuthToken
    ) {
        super()
    }
}