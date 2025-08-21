import { Step } from "@app/batch/step"
import { DataSource } from "typeorm"
import { DailyFeedReader } from "./daily-feed.reader"
import { DailyFeedProcessor } from "./daily-feed.processor"
import { DailyFeedWriter } from "./daily-feed.writer"
import { YYYYMMDD } from "@core/util"

export const dailyFeedStep = (ds : DataSource, date : YYYYMMDD, slot : 1|2|3) => {
    const em = ds.createEntityManager();
    return new Step(
        new DailyFeedReader(em,1000),
        new DailyFeedProcessor(em, date, slot),
        new DailyFeedWriter(em, date, slot, date.add(1, 'day').toDate()),
        { name : `daily_feed_${slot}` , chunkSize : 200}
    )
}