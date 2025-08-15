import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Observable } from "rxjs";
import { UserService } from "../service/user.service";

@Injectable()
export class UserGuard implements CanActivate {
    constructor(
        private readonly userService : UserService
    ) {}
    canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
        const request = context.switchToHttp().getRequest();
        const { providerId, providerType } = request.auth;
        if(!providerId || !providerType) {
            throw new ForbiddenException(`인증 프로바이더 정보가 없습니다.`)
        } 
        const user = this.userService.getUserFromProvider(providerType, providerId);
        request.user = user;
        return true;
    }

}