import { Job } from "#app/batch/job"
import { dailyFeedStep } from "./daily-feed.step.js"
import { EntityManager } from "@core/database/mikro"
import { YYYYMMDD } from "@core/util"

export const dailyFeedJob = (entityManager: EntityManager, date: YYYYMMDD, slot: 1|2|3) => {
    return new Job(`daily_feed_${date}_${slot}`, [dailyFeedStep(entityManager,date,slot)])
}
