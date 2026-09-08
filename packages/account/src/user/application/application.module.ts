import { Module, type Provider } from "@nestjs/common";
import { UpdateUserProfileHandler } from "./service/command/update-user-profile.command.js";
import { GetUserProfileHandler } from "./service/query/get-user-profile.query.js";
import { UserInfraStructureModule } from "../infrastructure/infrastructure.module.js";
import { GenerateUserPresignedUrlHandler } from "./service/command/generate-user-presigned.command.js";
import { CreateUserProfileHandler } from "./service/command/create-user-profile.command.js";
import { ReviewUserImageHandler } from "./service/command/review-user-image.command.js";
import { DeleteProfileImageHandler } from "./service/command/delete-profile-image.command.js";


const providers : Provider[] = [
    
    // Query
    GetUserProfileHandler,

    // Command
    CreateUserProfileHandler,
    UpdateUserProfileHandler,
    GenerateUserPresignedUrlHandler,
    ReviewUserImageHandler,
    DeleteProfileImageHandler,
]

@Module({
    imports: [
        UserInfraStructureModule,
    ],
    providers : providers,
    exports : providers,
})
export class UserApplicationModule {}