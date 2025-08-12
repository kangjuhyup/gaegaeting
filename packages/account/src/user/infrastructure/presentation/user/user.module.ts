import { Module } from "@nestjs/common";
import { UserController } from "./user.controller";
import { CreateUserHandler } from "@app/user/application/service/command/create-user.command";
import { UpdateUserHandler } from "@app/user/application/service/command/update-user.command";
import { DeleteUserHandler } from "@app/user/application/service/command/delete-user.command";
import { GetUserHandler } from "@app/user/application/service/query/get-user.query";
@Module({
  controllers: [UserController],
  providers: [
    CreateUserHandler,
    UpdateUserHandler,
    DeleteUserHandler,
    GetUserHandler,
  ],
})
export class UserModule {}
