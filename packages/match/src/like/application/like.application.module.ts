import { Module, Provider } from "@nestjs/common";
import { LikeInfrastructureModule } from "../infrastructure/like.infrastructure.module";
import { GetLikeInHandler } from "./service/query/get-like-in.query";
import { GetLikeOutHandler } from "./service/query/get-like-out.query";
import { SaveLikeHandler } from "./service/command/save-like.command";
import { CancelLikeHandler } from "./service/command/cancel-like.command";

const providers : Provider[] = [
    // Query
    GetLikeInHandler,
    GetLikeOutHandler,

    //Command
    SaveLikeHandler,
    CancelLikeHandler
]

@Module({
    imports : [
        LikeInfrastructureModule
    ],
    providers
})
export class LikeApplicationModule{}