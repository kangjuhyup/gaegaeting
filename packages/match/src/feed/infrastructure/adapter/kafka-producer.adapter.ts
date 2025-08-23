import { Injectable } from "@nestjs/common";
import { KafkaProducerPort } from "@app/feed/domain/port/kafka-producer.port";
import { KafkaProducerService } from "@core/kafka";

@Injectable()
export class KafkaProducerAdapter implements KafkaProducerPort {
    constructor(
        private readonly kafkaProducer : KafkaProducerService
    ) {}
    
    async produce(topic: string, payload: any): Promise<void> {
        await this.kafkaProducer.send(topic,payload)
    }
}