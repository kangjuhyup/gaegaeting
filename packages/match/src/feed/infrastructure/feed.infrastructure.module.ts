import { Module, Provider } from "@nestjs/common";
import { FeedController } from "./persentation/feed.controller";

const providers : Provider[] = []

@Module({
    controllers: [
        FeedController
    ]
})
export class FeedInfrastructureModule {}