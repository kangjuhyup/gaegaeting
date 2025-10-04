import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { AdminLoginCommand } from "../../port/command/admin-login.port";
import { AuthToken } from "@app/auth/domain/model/auth-token";
import { ConfigService } from "@nestjs/config";
import { AuthTokenService } from "../auth-token.service";
import { BadRequestException } from "@nestjs/common";
import { ENV_KEY } from "@app/config/env.config";

@CommandHandler(AdminLoginCommand)
export class AdminLoginCommandHandler implements ICommandHandler<AdminLoginCommand,AuthToken> {
    
    private readonly id = 'admin'
    private readonly password : string
    constructor(
        private readonly config : ConfigService,
        private readonly authTokenService : AuthTokenService
    ) {
        this.password = config.get(ENV_KEY.ADMIN_PASSWORD)
    }


    async execute(command: AdminLoginCommand): Promise<AuthToken> {
        const { id, password } = command
        if(id !== this.id || password !== password) {
            throw new BadRequestException('ID 또는 패스워드가 잘못되었습니다.')
        }
        return await this.authTokenService.createAdminToken(id)
    }
}