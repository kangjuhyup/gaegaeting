import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { CancelPairCommand } from "../../port/command/cancel-pair.port";
import { PairRepositoryPort } from "@app/pair/domain/port/pair.repository.port";
import { ForbiddenException } from "@nestjs/common";

@CommandHandler(CancelPairCommand)
export class CancelPairHandler implements ICommandHandler<CancelPairCommand,void> {

    constructor(
        private readonly pairRepository : PairRepositoryPort
    ) {}

    async execute(command : CancelPairCommand) : Promise<void> {
        const pair = await this.pairRepository.selectPairFromId(command.pairId)
        if(command.user.userId !== (pair.leftUserId || pair.rightUserId)) {
            throw new ForbiddenException('내 매칭이 아닙니다.')
        }
        pair.cancel()
        await this.pairRepository.updatePair(pair)
    }
}