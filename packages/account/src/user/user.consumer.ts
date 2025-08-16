import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import { ClientKafka } from "@nestjs/microservices";
import { UserRepositoryPort } from "./domain/port/out/user-repository.port";
import { ProfileEntity } from "./domain/model/profile";

interface S3ObjectCreatedEvent {
    eventName: string;
    key: string;
    size: number;
    eTag: string;
    sequencer: string;
}

@Injectable()
export class UserConsumer {
    
}
