import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";
import { CancelPairCommand } from "../../port/command/cancel-pair.port.js";
import { PairRepositoryPort } from "#app/pair/domain/port/pair.repository.port";
import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { Transactional } from "@core/database";

@CommandHandler(CancelPairCommand)
export class CancelPairHandler implements ICommandHandler<
  CancelPairCommand,
  void
> {
  constructor(private readonly pairRepository: PairRepositoryPort) {}

  @Transactional()
  async execute(command: CancelPairCommand): Promise<void> {
    const pair = await this.pairRepository.selectPairFromId(command.pairId);
    if (!pair) throw new NotFoundException("매칭을 찾을 수 없습니다.");
    if (![pair.leftUserId, pair.rightUserId].includes(command.user.userId)) {
      throw new ForbiddenException("내 매칭이 아닙니다.");
    }
    pair.cancel();
    await this.pairRepository.updatePair(pair);
  }
}
