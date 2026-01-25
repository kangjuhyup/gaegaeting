import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { AcceptLikeCommand } from "../../port/command/accept-like.command";
import { LikeRepositoryPort } from "@app/like/domain/port/like.repository.port";
import { LikeEntity } from "@app/like/domain/model/like";
import { Topics } from "@app/common/topic";
import { EventPublisherPort } from "@app/feed/domain/port/event-publisher.port";
import { MatchPairCreatedV1Payload } from "@app/common/payload";
import { Transactional } from "@core/database";
import { DataSource } from "typeorm";

@CommandHandler(AcceptLikeCommand)
export class AcceptLikeHandler implements ICommandHandler<AcceptLikeCommand, void> {
    
    constructor(
        private readonly likeRepository : LikeRepositoryPort,
        private readonly eventPublisher : EventPublisherPort,
        private readonly dataSource : DataSource
    ) {}

    @Transactional()
    async execute(command: AcceptLikeCommand): Promise<void> {
        const like = await this.likeRepository.selectLikeFromId(command.likeId)
        const myLike = LikeEntity.of({
                    likerId : command.user.userId,
                    likeeId : like.likerId,
                    source : like.source,
                    active : true
                })
        const savedLike = await this.likeRepository.saveLike(myLike)
        await this.eventPublisher.publish(Topics.MATCH_PAIR_CREATED_V1, new MatchPairCreatedV1Payload(
            command.user.userId,
            like.likerId,
            like.id,
            savedLike.id
        ));
        return
    }
}
