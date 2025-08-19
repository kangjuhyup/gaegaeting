import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { DailyFeedScheduler } from "./scheduler/daily-feed.scheduler";

@Module({
    imports: [ScheduleModule.forRoot()],
    providers : [
        DailyFeedScheduler
    ]
})
export class BatchModule {}