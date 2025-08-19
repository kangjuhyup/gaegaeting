import { Step } from "@app/batch/step"
import { DataSource } from "typeorm"
import { DailyFeedReader } from "./daily-feed.reader"
import { DailyFeedProcessor } from "./daily-feed.processor"
import { DailyFeedWriter } from "./daily-feed.writer"

export const dailyFeedStep = (ds : DataSource, date : string, slot : 1|2|3) => {
    return new Step(
        new DailyFeedReader(ds,1000),
        new DailyFeedProcessor(ds, date, slot),
        new DailyFeedWriter(ds, date, slot, new Date(date + 'T' + slot * 2 * 60 * 60 * 1000)),
        { name : `daily_feed_${slot}` , chunkSize : 200}
    )
}