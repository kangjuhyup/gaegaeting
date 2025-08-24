import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { SaveLikeCommand } from "../../port/command/save-like.port";
import { LikeEntity } from "@app/like/domain/model/like";
import { LikeRepositoryPort } from "@app/like/domain/port/like.repository.port";
import { Topics } from "@app/common/topic";
import { KafkaProducerPort } from "@app/feed/domain/port/kafka-producer.port";
import { MatchPairCreatedV1Payload, NotificationFcmSendV1Payload } from "@app/common/payload";
import { EventPublisherPort } from "@app/feed/domain/port/event-publisher.port";

@CommandHandler(SaveLikeCommand)
export class SaveLikeHandler implements ICommandHandler<SaveLikeCommand,LikeEntity> {
    
    constructor(
        private readonly likeRepository : LikeRepositoryPort,
        private readonly kafkaProducer : KafkaProducerPort,
        private readonly eventPublisher : EventPublisherPort
    ) {}
    
    async execute(command: SaveLikeCommand): Promise<LikeEntity> {
        const like = LikeEntity.of({
            likerId : command.likerId,
            likeeId : command.likeeId,
            source : command.source,
            active : true
        })
        const savedLike = await this.likeRepository.saveLike(like)
        const likeIn = await this.likeRepository.selectLikeInFromUserId(command.likeeId)
        // 상대방이 나를 LIKE 했던 적이 있을 경우 Pair 생성 이벤트 발생
        if(likeIn.some(l => l.likerId === command.likerId)) {
            await this.eventPublisher.publish(Topics.MATCH_PAIR_CREATED_V1, new MatchPairCreatedV1Payload(
                command.likerId,
                command.likeeId,
                like.id,
                likeIn.find(l => l.likerId === command.likerId)!.id
            ));
        } else { // 없을 경우 FCM 메세지 발송
            await this.kafkaProducer.produce(Topics.NOTIFICATION_FCM_SEND_V1, new NotificationFcmSendV1Payload(
                'like',
                command.likeeId,
                like.id
            ));
        }
        return savedLike
    }
}