import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { FeedScheduler } from "./scheduler/feed.scheduler.js";

@Module({
    imports: [ScheduleModule.forRoot()],
    providers : [
        FeedScheduler
    ]
})
export class BatchModule {}