import { Module } from "@nestjs/common";
import { UserController } from "./user.controller";
import { CreateUserHandler } from "@app/application/service/command/create-user.command";
import { UpdateUserHandler } from "@app/application/service/command/update-user.command";
import { DeleteUserHandler } from "@app/application/service/command/delete-user.command";
import { GetUserHandler } from "@app/application/service/query/get-user.query";
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
