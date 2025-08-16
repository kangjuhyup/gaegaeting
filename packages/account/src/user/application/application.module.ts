import { Module, Provider } from "@nestjs/common";
import { CreateUserHandler } from "./service/command/create-user.command";
import { UpdateUserHandler } from "./service/command/update-user.command";
import { GetUserHandler } from "./service/query/get-user.query";
import { UserInfraStructureModule } from "../infrastructure/infrastructure.module";
import { GenerateUserPresignedUrlHandler } from "./service/command/generate-user-presigned.command";


const providers : Provider[] = [
    
    // Query
    GetUserHandler,

    // Command
    CreateUserHandler,
    UpdateUserHandler,
    GenerateUserPresignedUrlHandler,
]

@Module({
    imports: [
        UserInfraStructureModule,
    ],
    providers : providers,
    exports : providers,
})
export class UserApplicationModule {}