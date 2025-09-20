import { Injectable } from "@nestjs/common";
import { EventPublisherPort } from "@app/feed/domain/port/event-publisher.port";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { TopicPayloadMap, Topics } from "@app/common/topic";

@Injectable()
export class EventPublisherAdapter implements EventPublisherPort {
    
    constructor(
        private readonly eventEmitter : EventEmitter2
    ) {}

    /**
     * 토픽과 페이로드를 매칭하여 이벤트를 발행합니다.
     * @param topic 이벤트 토픽
     * @param payload 토픽에 매칭되는 페이로드
     */
    async publish<T extends Topics>(topic: T, payload: TopicPayloadMap[T]): Promise<void> {
        console.log('publish')
        console.log(topic)
        this.eventEmitter.emit(topic, payload)
    }
}