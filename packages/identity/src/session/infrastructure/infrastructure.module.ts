import { Module, Provider } from "@nestjs/common";
import { AuthApiClient } from "./adapter/out/api/auth-api.client";
import { AuthApiPort } from "./port/auth-api.port";

const providers: Provider[] = [
  {
    provide: AuthApiPort,
    useClass: AuthApiClient,
  },
];

@Module({
  imports: [],
  providers,
  exports: [...providers],
})
export class InfrastructureModule {}
