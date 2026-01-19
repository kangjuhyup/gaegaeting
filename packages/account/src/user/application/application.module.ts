import { Module, Provider } from "@nestjs/common";
import { UpdateUserProfileHandler } from "./service/command/update-user-profile.command";
import { GetUserProfileHandler } from "./service/query/get-user-profile.query";
import { GetUserProfilesByIdsHandler } from "./service/query/get-user-profiles-by-ids.query";
import { GetUserAttachmentsByUserIdsHandler } from "./service/query/get-user-attachments-by-user-ids.query";
import { UserInfraStructureModule } from "../infrastructure/infrastructure.module";
import { GenerateUserPresignedUrlHandler } from "./service/command/generate-user-presigned.command";
import { CreateUserProfileHandler } from "./service/command/create-user-profile.command";
import { ReviewUserImageHandler } from "./service/command/review-user-image.command";
import { DeleteProfileImageHandler } from "./service/command/delete-profile-image.command";


const providers : Provider[] = [
    
    // Query
    GetUserProfileHandler,
    GetUserProfilesByIdsHandler,
    GetUserAttachmentsByUserIdsHandler,

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