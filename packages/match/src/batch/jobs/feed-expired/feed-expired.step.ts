import { Step } from "@app/batch/step"
import { DataSource } from "typeorm"
import { FeedExpiredReader } from "./feed-expired.reader"
import { FeedExpiredWriter } from "./feed-expired.writer"
import { FeedExpiredProcessor } from "./feed-expired.processor"

export const feedExpiredStep = (ds : DataSource) => {
    const em = ds.createEntityManager();
    return new Step(
        new FeedExpiredReader(em,1000),
        new FeedExpiredProcessor(),
        new FeedExpiredWriter(em),
        { name : `feed_expired` , chunkSize : 200}
    )
}