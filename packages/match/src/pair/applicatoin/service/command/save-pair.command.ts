import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { SavePairCommand } from "../../port/command/save-pair.port";
import { PairEntity } from "@app/pair/domain/model/pair";
import { PairRepositoryPort } from "@app/pair/domain/port/pair.repository.port";
import { KafkaProducerPort } from "@app/pair/domain/port/kafka-producer.port";
import { Topics } from "@app/common/topic";

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
        await this.kafkaProducer.produce(Topics.CHAT_ROOM_CREATED_V1, {})
        return await this.pairRepository.savePair(pair)
    }
}