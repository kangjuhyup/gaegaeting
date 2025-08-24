import { Cron } from "@nestjs/schedule";
import { DataSource } from "typeorm";
import { dailyFeedJob } from "../jobs/daily-feed/daily-feed.job";
import { KrDateClass } from "@core/util";
import { feedExpiredJob } from "../jobs/feed-expired/feed-expired.job";

export class FeedScheduler {

    constructor(
        private readonly ds : DataSource
    ) {}

    @Cron('0 0 8 * * *', {timeZone : 'Asia/Seoul'})
    async morningFeed() {
        await this.runSlot(1);
    }

    @Cron('0 0 12 * * *', {timeZone : 'Asia/Seoul'})
    async noonFeed() {
        await this.runSlot(2);
    }

    @Cron('0 0 18 * * *', {timeZone : 'Asia/Seoul'})
    async eveningFeed() {
        await this.runSlot(3);
    }

    private async runSlot(slot : 1|2|3) {
        const date = KrDateClass.toYYYYMMDD();
        await dailyFeedJob(this.ds, date, slot).run();
    }

    @Cron('0 0 1 * * *', {timeZone : 'Asia/Seoul'})
    async expiredFeed() {
        await feedExpiredJob(this.ds).run();
    }
}