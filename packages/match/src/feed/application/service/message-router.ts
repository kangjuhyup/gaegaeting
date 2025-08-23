import { Injectable } from "@nestjs/common";
import { Topics } from "../topic";
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

    async sendMessage(topic: Topics, payload: any): Promise<void> {
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