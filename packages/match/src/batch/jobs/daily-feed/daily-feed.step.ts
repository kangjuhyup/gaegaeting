import { Step } from "#app/batch/step"
import { EntityManager } from "@core/database/mikro"
import { DailyFeedReader } from "./daily-feed.reader.js"
import { DailyFeedProcessor } from "./daily-feed.processor.js"
import { DailyFeedWriter } from "./daily-feed.writer.js"
import { YYYYMMDD } from "@core/util"

export const dailyFeedStep = (em: EntityManager, date : YYYYMMDD, slot : 1|2|3) => {
    return new Step(
        new DailyFeedReader(em,1000),
        new DailyFeedProcessor(em, date, slot),
        new DailyFeedWriter(em, date, slot, date.add(1, 'day').toDate()),
        { name : `daily_feed_${slot}` , chunkSize : 200}
    )
}
