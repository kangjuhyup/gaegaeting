import { CommandHandler } from "@nestjs/cqrs";
import { ReportPairCommand } from "../../port/command/report-pair.port.js";
import { type ICommandHandler } from "@nestjs/cqrs";
import { PairRepositoryPort } from "#app/pair/domain/port/pair.repository.port";
import { KafkaProducerPort } from "#app/pair/domain/port/kafka-producer.port";
import { Topics } from "#app/common/topic";
import { ForbiddenException, NotFoundException } from "@nestjs/common";

@CommandHandler(ReportPairCommand)
export class ReportPairHandler implements ICommandHandler<
  ReportPairCommand,
  void
> {
  constructor(
    private readonly pairRepository: PairRepositoryPort,
    private readonly kafkaProducer: KafkaProducerPort,
  ) {}

  async execute(command: ReportPairCommand): Promise<void> {
    const pair = await this.pairRepository.selectPairFromId(command.pairId);
    if (!pair) throw new NotFoundException("매칭을 찾을 수 없습니다.");
    if (![pair.leftUserId, pair.rightUserId].includes(command.user.userId)) {
      throw new ForbiddenException("내 매칭이 아닙니다.");
    }
    pair.cancel();
    await this.kafkaProducer.produce(Topics.MATCH_PAIR_REPORTED_V1, {
      pairId: pair.id,
      reporterId: command.user.userId,
      reason: command.reason,
    });
    await this.pairRepository.updatePair(pair);
  }
}
