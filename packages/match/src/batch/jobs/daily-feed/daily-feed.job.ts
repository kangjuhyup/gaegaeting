import { Job } from "@app/batch/job"
import { dailyFeedStep } from "./daily-feed.step"
import { DataSource } from "typeorm"
import { YYYYMMDD } from "@core/util"

export const dailyFeedJob = (ds:DataSource, date: YYYYMMDD, slot: 1|2|3) => {
    return new Job(`daily_feed_${date}_${slot}`, [dailyFeedStep(ds,date,slot)])
}