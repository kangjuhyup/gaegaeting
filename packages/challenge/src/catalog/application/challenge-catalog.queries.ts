import { Injectable } from "@nestjs/common";
import {
  CHALLENGES,
  type ChallengeKind,
} from "../domain/challenge-definition.js";

@Injectable()
export class ChallengeCatalogQueries {
  definitions() {
    return CHALLENGES;
  }

  definition(kind: ChallengeKind) {
    return CHALLENGES.find((item) => item.kind === kind);
  }
}
