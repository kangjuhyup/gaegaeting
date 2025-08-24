import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { CancelLikeCommand } from "../../port/command/cancel-like.port";
import { LikeRepositoryPort } from "@app/like/domain/port/like.repository.port";
import { ForbiddenException } from "@nestjs/common";

@CommandHandler(CancelLikeCommand)
export class CancelLikeHandler implements ICommandHandler<CancelLikeCommand> {
    
    constructor(
        private readonly likeRepository : LikeRepositoryPort
    ) {}
    
    async execute(command: CancelLikeCommand): Promise<void> {
        const like = await this.likeRepository.selectLikeFromId(command.likeId)
        if(like.likeeId !== command.user.userId) {
            throw new ForbiddenException('내가받은 LIKE가 아닙니다.')
        }
        like.cancel()
        await this.likeRepository.updateLike(like)
    }
}