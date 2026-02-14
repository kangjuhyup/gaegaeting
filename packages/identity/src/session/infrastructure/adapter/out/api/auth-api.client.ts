import { AuthApiPort } from "@app/session/infrastructure/port/auth-api.port";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class AuthApiClient implements AuthApiPort {
  constructor(private readonly config: ConfigService) {}
}
