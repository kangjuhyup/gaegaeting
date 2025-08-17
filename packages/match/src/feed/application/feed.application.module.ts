import { Module } from "@nestjs/common";
import { FeedInfrastructureModule } from "../infrastructure/feed.infrastructure.module";

@Module({
    imports : [
        FeedInfrastructureModule
    ]
})
export class FeedApplicationModule{}