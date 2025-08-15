import { Module } from "@nestjs/common";
import { UserController } from "./user.controller";
import { UserApplicationModule } from "@app/user/application/application.module";
@Module({
  imports : [
    UserApplicationModule
  ],
  controllers: [UserController],
  providers: [],
})
export class UserModule {}
