import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { FeedScheduler } from "./scheduler/feed.scheduler";

@Module({
    imports: [ScheduleModule.forRoot()],
    providers : [
        FeedScheduler
    ]
})
export class BatchModule {}