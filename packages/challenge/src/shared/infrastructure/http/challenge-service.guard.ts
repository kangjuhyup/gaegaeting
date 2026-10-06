import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { timingSafeEqual } from "node:crypto";

@Injectable()
export class ChallengeServiceGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}
  canActivate(context: ExecutionContext): boolean {
    const expected = this.config.get<string>("CHALLENGE_ACTIVITY_SECRET");
    const header: unknown = context.switchToHttp().getRequest()
      .headers?.authorization;
    if (
      !expected ||
      expected.length < 32 ||
      typeof header !== "string" ||
      header.length > 1024 ||
      !header.startsWith("Bearer ")
    ) {
      throw new UnauthorizedException("서비스 인증이 필요합니다.");
    }
    const actual = Buffer.from(header.slice(7));
    const secret = Buffer.from(expected);
    if (actual.length !== secret.length || !timingSafeEqual(actual, secret))
      throw new UnauthorizedException("서비스 인증이 필요합니다.");
    return true;
  }
}
