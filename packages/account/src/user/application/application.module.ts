import { Module, Provider } from "@nestjs/common";
import { CreateUserHandler } from "./service/command/create-user.command";
import { DeleteUserHandler } from "./service/command/delete-user.command";
import { UpdateUserHandler } from "./service/command/update-user.command";
import { GetUserHandler } from "./service/query/get-user.query";
import { UserInfraStructureModule } from "../infrastructure/infrastructure.module";

const providers : Provider[] = [
    // Query
    GetUserHandler,

    // Command
    CreateUserHandler,
    DeleteUserHandler,
    UpdateUserHandler,
]

@Module({
    imports: [
        UserInfraStructureModule,
    ],
    providers : providers,
    exports : providers,
})
export class UserApplicationModule {}