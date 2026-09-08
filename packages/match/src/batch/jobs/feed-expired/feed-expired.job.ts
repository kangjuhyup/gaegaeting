import { Job } from "#app/batch/job"
import { feedExpiredStep } from "./feed-expired.step.js"
import { EntityManager } from "@core/database/mikro"

export const feedExpiredJob = (entityManager: EntityManager) => {
    return new Job(`feed_expired`, [feedExpiredStep(entityManager)])
}
