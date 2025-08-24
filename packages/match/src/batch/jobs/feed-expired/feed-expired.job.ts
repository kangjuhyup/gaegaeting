import { Job } from "@app/batch/job"
import { feedExpiredStep } from "./feed-expired.step"
import { DataSource } from "typeorm"

export const feedExpiredJob = (ds:DataSource) => {
    return new Job(`feed_expired`, [feedExpiredStep(ds)])
}