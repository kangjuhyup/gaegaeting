import { TopicPayloadMap, Topics } from "../../../common/topic";

export abstract class KafkaProducerPort {
    /**
     * 토픽과 페이로드를 매칭하여 카프카로 메시지를 전송합니다.
     * @param topic 메시지 토픽
     * @param payload 토픽에 매칭되는 페이로드
     */
    abstract produce<T extends Topics>(topic: T, payload: TopicPayloadMap[T]): Promise<void>
}