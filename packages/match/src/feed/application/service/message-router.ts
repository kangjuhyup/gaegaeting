import { Injectable } from "@nestjs/common";
import { TopicPayloadMap, Topics } from "../../../common/topic";
import { KafkaProducerPort } from "@app/feed/domain/port/kafka-producer.port";
import { EventPublisherPort } from "@app/feed/domain/port/event-publisher.port";

export type RouteRule =
  | { match: { prefix: string }, target: RouteTarget }
  | { match: { regex: RegExp }, target: RouteTarget }
  | { match: { equals: string }, target: RouteTarget };

export type RouteTarget = 'event' | 'kafka';

@Injectable()
export class MessageRouter {
    
    constructor(
        private readonly routing : {
            rules : RouteRule[],
            default : RouteTarget
        },
        private readonly eventPublisher : EventPublisherPort,
        private readonly kafkaProducer : KafkaProducerPort
    ){}

    /**
     * 토픽과 페이로드를 매칭하여 메시지를 전송합니다.
     * @param topic 메시지 토픽
     * @param payload 토픽에 매칭되는 페이로드
     */
    async sendMessage<T extends Topics>(topic: T, payload: TopicPayloadMap[T]): Promise<void> {
        const target = this.resolve(topic);
        if (target === 'event') {
          await this.eventPublisher.publish(topic, payload);
        } else {
          await this.kafkaProducer.produce(topic, payload);
        }
      }

    private resolve(topic: Topics): RouteTarget {
        for (const r of this.routing.rules) {
          if ('equals' in r.match && topic === r.match.equals) return r.target;
          if ('prefix' in r.match && topic.startsWith(r.match.prefix)) return r.target;
          if ('regex' in r.match && r.match.regex.test(topic)) return r.target;
        }
        return this.routing.default;
      }
}