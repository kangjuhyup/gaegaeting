import { AuthEntity } from "@app/auth/domain/model/auth";
import { AuthProvider } from "@core/database";
import { Command } from "@nestjs/cqrs";

export class SocialLoginCommand extends Command<AuthEntity> {
    
    constructor(
        public readonly provider : AuthProvider,
        public readonly code : string,
        public readonly state : string,
    ) {
        super()
    }
}