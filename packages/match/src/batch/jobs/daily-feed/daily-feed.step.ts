import { Step } from "#app/batch/step"
import { EntityManager } from "@core/database/mikro"
import { DailyFeedReader } from "./daily-feed.reader.js"
import { DailyFeedProcessor } from "./daily-feed.processor.js"
import { DailyFeedWriter } from "./daily-feed.writer.js"
import { YYYYMMDD } from "@core/util"
import { LocationOrmRepository } from "#app/location/infrastructure/adapter/outbound/presistence/location.orm.repository"

import { getDailyFeedExpiresAt } from "#app/feed/domain/daily-feed-policy"

export const dailyFeedStep = (em: EntityManager, date : YYYYMMDD, slot : 1|2|3) => {
    return new Step(
        new DailyFeedReader(em,1000),
        new DailyFeedProcessor(new LocationOrmRepository(em), date),
        new DailyFeedWriter(em, date, slot, getDailyFeedExpiresAt(date)),
        { name : `daily_feed_${slot}` , chunkSize : 200}
    )
}
