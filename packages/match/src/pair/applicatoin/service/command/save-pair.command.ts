import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { SavePairCommand } from "../../port/command/save-pair.port";
import { PairEntity } from "@app/pair/domain/model/pair";
import { PairRepositoryPort } from "@app/pair/domain/port/pair.repository.port";
import { KafkaProducerPort } from "@app/pair/domain/port/kafka-producer.port";
import { Topics } from "@app/common/topic";
import { ChatRoomCreatedV1Payload } from "@app/common/payload";

@CommandHandler(SavePairCommand)
export class SavePairHandler implements ICommandHandler<SavePairCommand,PairEntity> {
    constructor(
        private readonly pairRepository : PairRepositoryPort,
        private readonly kafkaProducer : KafkaProducerPort
    ) {}

    async execute(command : SavePairCommand) : Promise<PairEntity> {
        const pair = PairEntity.of({
            leftUserId: command.leftUserId,
            rightUserId: command.rightUserId,
            active: true
        })
        
        const savedPair = await this.pairRepository.savePair(pair)
        
        // Pair 생성 완료 후 Chat Room 생성을 위한 Kafka 메시지 발송
        const payload = new ChatRoomCreatedV1Payload(
            command.leftUserId,
            command.rightUserId,
            savedPair.id
        );
        await this.kafkaProducer.produce(Topics.CHAT_ROOM_CREATED_V1, payload)
        
        return savedPair
    }
}