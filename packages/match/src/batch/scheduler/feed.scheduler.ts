import { Cron } from "@nestjs/schedule";
import { EntityManager } from "@core/database/mikro";
import { dailyFeedJob } from "../jobs/daily-feed/daily-feed.job.js";
import { feedExpiredJob } from "../jobs/feed-expired/feed-expired.job.js";
import { DAILY_FEED_HOURS, getDailyFeedDate } from "#app/feed/domain/daily-feed-policy";

export class FeedScheduler {

    constructor(
        private readonly entityManager: EntityManager
    ) {}

    @Cron(`0 0 ${DAILY_FEED_HOURS[0]} * * *`, {timeZone : 'Asia/Seoul'})
    async morningFeed() {
        await this.runSlot(1);
    }

    @Cron(`0 0 ${DAILY_FEED_HOURS[1]} * * *`, {timeZone : 'Asia/Seoul'})
    async noonFeed() {
        await this.runSlot(2);
    }

    @Cron(`0 0 ${DAILY_FEED_HOURS[2]} * * *`, {timeZone : 'Asia/Seoul'})
    async eveningFeed() {
        await this.runSlot(3);
    }

    private async runSlot(slot : 1|2|3) {
        const date = getDailyFeedDate(new Date());
        await dailyFeedJob(this.entityManager.fork(), date, slot).run();
    }

    @Cron('0 0 1 * * *', {timeZone : 'Asia/Seoul'})
    async expiredFeed() {
        await feedExpiredJob(this.entityManager.fork()).run();
    }
}
