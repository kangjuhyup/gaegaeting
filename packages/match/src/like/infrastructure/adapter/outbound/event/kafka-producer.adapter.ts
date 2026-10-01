import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ENV_KEY } from "#app/config/env.config";
import { KafkaProducerService } from "@core/kafka";
import { type TopicPayloadMap, Topics } from "#app/common/topic";
import { KafkaProducerPort } from "#app/like/domain/port/kafka-producer.port";

@Injectable()
export class KafkaProducerAdapter implements KafkaProducerPort {
    constructor(
        private readonly kafkaProducer : KafkaProducerService,
        private readonly configService: ConfigService
    ) {}
    
    /**
     * 토픽과 페이로드를 매칭하여 카프카로 메시지를 전송합니다.
     * @param topic 메시지 토픽
     * @param payload 토픽에 매칭되는 페이로드
     */
    async produce<T extends Topics>(topic: T, payload: TopicPayloadMap[T]): Promise<void> {
        const prefix = this.configService.get<string>(ENV_KEY.KAFKA_TOPIC_PREFIX) ?? '';
        await this.kafkaProducer.send(prefix ? `${prefix}.${topic}` : topic, [{ value: JSON.stringify(payload) }])
    }
}