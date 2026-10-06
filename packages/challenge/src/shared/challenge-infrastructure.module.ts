import { WalkingAccountPort } from "./application/walking-account.port.js";
import { WalkingAccountAdapter } from "./infrastructure/walking-account.adapter.js";
import { Module } from "@nestjs/common";
import { ChallengeClock } from "./application/challenge-clock.js";
import { ChallengeRepository } from "./application/challenge.repository.js";
import { ChallengeServiceGuard } from "./infrastructure/http/challenge-service.guard.js";
import { ChallengeOrmRepository } from "./infrastructure/persistence/challenge.orm.repository.js";
import { ChallengeTransaction } from "./application/challenge-transaction.js";
import { ChallengeSession } from "./infrastructure/persistence/challenge-session.js";

/** Shared transaction storage; feature services remain private to their modules. */
@Module({
  providers: [
    { provide: WalkingAccountPort, useClass: WalkingAccountAdapter },
    ChallengeSession,
    { provide: ChallengeTransaction, useExisting: ChallengeSession },
    { provide: ChallengeRepository, useClass: ChallengeOrmRepository },
    { provide: ChallengeClock, useValue: { now: () => new Date() } },
    ChallengeServiceGuard,
  ],
  exports: [
    WalkingAccountPort,
    ChallengeRepository,
    ChallengeClock,
    ChallengeServiceGuard,
    ChallengeTransaction,
    ChallengeSession,
  ],
})
export class ChallengeInfrastructureModule {}
