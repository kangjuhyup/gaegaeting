import { Step } from "#app/batch/step"
import { EntityManager } from "@core/database/mikro"
import { FeedExpiredReader } from "./feed-expired.reader.js"
import { FeedExpiredWriter } from "./feed-expired.writer.js"
import { FeedExpiredProcessor } from "./feed-expired.processor.js"

export const feedExpiredStep = (em: EntityManager) => {
    return new Step(
        new FeedExpiredReader(em,1000),
        new FeedExpiredProcessor(),
        new FeedExpiredWriter(em),
        { name : `feed_expired` , chunkSize : 200}
    )
}
