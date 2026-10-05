import { Module } from "@nestjs/common";
import { ChallengeInfrastructureModule } from "../../shared/challenge-infrastructure.module.js";
import { DiaryRepository } from "../application/diary.repository.js";
import { DiaryOrmRepository } from "./persistence/diary.orm.repository.js";
@Module({
  imports: [ChallengeInfrastructureModule],
  providers: [{ provide: DiaryRepository, useClass: DiaryOrmRepository }],
  exports: [DiaryRepository],
})
export class DiaryPersistenceModule {}
