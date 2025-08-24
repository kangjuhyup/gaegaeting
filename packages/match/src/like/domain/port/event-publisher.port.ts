import { TopicPayloadMap, Topics } from "../../../common/topic";

export abstract class EventPublisherPort {
    /**
     * 토픽과 페이로드를 매칭하여 이벤트를 발행합니다.
     * @param topic 이벤트 토픽
     * @param payload 토픽에 매칭되는 페이로드
     */
    abstract publish<T extends Topics>(topic: T, payload: TopicPayloadMap[T]): Promise<void>
}