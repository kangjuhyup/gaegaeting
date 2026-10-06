import { Module } from "@nestjs/common";
import { PairInfrastructureModule } from "../infrastructure/pair.infrastructure.module.js";

import { CancelPairHandler } from "./service/command/cancel-pair.command.js";
import { ReportPairHandler } from "./service/command/report-pair.port.js";
import { SavePairHandler } from "./service/command/save-pair.command.js";

@Module({
  providers: [CancelPairHandler, ReportPairHandler, SavePairHandler],
  imports: [PairInfrastructureModule],
})
export class PairApplicationModule {}
