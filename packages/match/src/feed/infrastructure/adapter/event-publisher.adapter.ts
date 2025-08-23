import { Injectable } from "@nestjs/common";
import { EventPublisherPort } from "@app/feed/domain/port/event-publisher.port";
import { EventEmitter2 } from "@nestjs/event-emitter";

@Injectable()
export class EventPublisherAdapter implements EventPublisherPort {
    
    constructor(
        private readonly eventEmitter : EventEmitter2
    ) {}

    async publish(topic: string, payload: any): Promise<void> {
        this.eventEmitter.emit(topic,payload)
    }
}