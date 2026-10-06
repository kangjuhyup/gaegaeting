import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";
import { AcceptLikeCommand } from "../../port/command/accept-like.command.js";
import { LikeRepositoryPort } from "#app/like/domain/port/like.repository.port";
import { LikeEntity } from "#app/like/domain/model/like";
import { Topics } from "#app/common/topic";
import { EventPublisherPort } from "#app/like/domain/port/event-publisher.port";
import { MatchPairCreatedV1Payload } from "#app/common/payload";
import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { Transactional } from "@core/database";

@CommandHandler(AcceptLikeCommand)
export class AcceptLikeHandler implements ICommandHandler<
  AcceptLikeCommand,
  void
> {
  constructor(
    private readonly likeRepository: LikeRepositoryPort,
    private readonly eventPublisher: EventPublisherPort,
  ) {}

  @Transactional()
  async execute(command: AcceptLikeCommand): Promise<void> {
    const like = await this.likeRepository.lockLikeFromId(command.likeId);
    if (!like) throw new NotFoundException("관심을 찾을 수 없습니다.");
    if (
      !like.active ||
      like.likeeId !== command.user.userId ||
      like.likerId === command.user.userId
    )
      throw new ForbiddenException("내가 받은 활성 관심만 수락할 수 있습니다.");
    const outgoing = await this.likeRepository.selectLikeOutFromUserId(
      command.user.userId,
    );
    if (outgoing.some((l) => l.active && l.likeeId === like.likerId)) return;
    const myLike = LikeEntity.of({
      likerId: command.user.userId,
      likeeId: like.likerId,
      source: like.source,
      active: true,
    });
    const savedLike = await this.likeRepository.saveLike(myLike);
    await this.eventPublisher.publish(
      Topics.MATCH_PAIR_CREATED_V1,
      new MatchPairCreatedV1Payload(
        command.user.userId,
        like.likerId,
        like.id,
        savedLike.id,
      ),
    );
    return;
  }
}
