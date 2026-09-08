import { Module, type Provider } from "@nestjs/common";
import { LikeInfrastructureModule } from "../infrastructure/like.infrastructure.module.js";
import { GetLikeInHandler } from "./service/query/get-like-in.query.js";
import { GetLikeOutHandler } from "./service/query/get-like-out.query.js";
import { SaveLikeHandler } from "./service/command/save-like.command.js";
import { CancelLikeHandler } from "./service/command/cancel-like.command.js";

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