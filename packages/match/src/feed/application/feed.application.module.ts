import { Module, Provider } from "@nestjs/common";
import { FeedInfrastructureModule } from "../infrastructure/feed.infrastructure.module";
import { GetMyFeedHandler } from "./service/query/get-my-feed.query";

const providers : Provider[] = [
    //Query
    GetMyFeedHandler
]

@Module({
    imports : [
        FeedInfrastructureModule
    ],
    providers,
})
export class FeedApplicationModule{}