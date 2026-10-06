import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { UserPrincipal } from "@core/auth";
import { createInternalAuthAssertion } from "@core/auth-assertion";
import { WalkingAccountPort } from "../application/walking-account.port.js";

@Injectable()
export class WalkingAccountAdapter extends WalkingAccountPort {
  constructor(private readonly config: ConfigService) {
    super();
  }
  async owner(user: UserPrincipal) {
    const assertion = createInternalAuthAssertion(
      {
        userId: user.userId,
        subject: user.subject,
        tenantId: user.tenantId,
        scopes: ["account:read"],
      },
      {
        secret: this.config.getOrThrow("INTERNAL_AUTH_ASSERTION_SECRET"),
        issuer: "gaegaeting-gateway",
        audience: "account",
      },
    );
    let body: {
      data?: {
        myProfile?: { id: string; nickname: string } | null;
        pets?: { id: number; name: string }[];
      };
      errors?: unknown;
    };
    try {
      const response = await fetch(
        this.config.get(
          "ACCOUNT_SERVICE_URL",
          "http://127.0.0.1:2800/account/graphql",
        ),
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-gaegaeting-principal": assertion,
          },
          body: JSON.stringify({
            query: "{ myProfile { id nickname } pets { id name } }",
          }),
          signal: AbortSignal.timeout(5000),
          redirect: "error",
        },
      );
      if (!response.ok) throw new Error("Account unavailable");
      body = (await response.json()) as typeof body;
      if (body.errors || !body.data || !Array.isArray(body.data.pets))
        throw new Error("Invalid Account response");
    } catch {
      throw new ServiceUnavailableException(
        "보호자와 반려견 정보를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      );
    }
    const profile = body.data!.myProfile;
    if (!profile || profile.id !== user.userId)
      throw new BadRequestException("보호자 프로필을 먼저 등록해 주세요.");
    if (
      typeof profile.nickname !== "string" ||
      !profile.nickname.trim() ||
      profile.nickname.length > 100 ||
      body.data!.pets!.some(
        (p) =>
          !Number.isSafeInteger(p.id) ||
          p.id < 1 ||
          typeof p.name !== "string" ||
          p.name.length > 100,
      )
    ) {
      throw new ServiceUnavailableException(
        "보호자 정보 형식이 올바르지 않습니다.",
      );
    }
    return { nickname: profile.nickname, pets: body.data!.pets! };
  }
}
