import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { UserService } from "../service/user.service";

@Injectable()
export class UserGuard implements CanActivate {
    constructor(
        private readonly userService : UserService
    ) {}
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const { providerId, provider } = request.auth;
        if(providerId === undefined || provider === undefined || provider.value === undefined) {
            throw new ForbiddenException(`인증 프로바이더 정보가 없습니다.`)
        } 
        const user = await this.userService.getUserFromProvider(provider.value, providerId).catch((err) => {
            throw new ForbiddenException(`유저 프로필을 등록해주세요.`)
        });
        request.user = user;
        return true;
    }

}