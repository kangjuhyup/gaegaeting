import { Module, Provider } from "@nestjs/common";
import { CreateUserHandler } from "./service/command/create-user.command";
import { UpdateUserHandler } from "./service/command/update-user.command";
import { GetUserHandler } from "./service/query/get-user.query";
import { UserInfraStructureModule } from "../infrastructure/infrastructure.module";
import { GeneratePresignedUrlHandler } from "./service/command/generate-presigned.command";

const providers : Provider[] = [
    // Query
    GetUserHandler,

    // Command
    CreateUserHandler,
    UpdateUserHandler,
    GeneratePresignedUrlHandler,
]

@Module({
    imports: [
        UserInfraStructureModule,
    ],
    providers : providers,
    exports : providers,
})
export class UserApplicationModule {}