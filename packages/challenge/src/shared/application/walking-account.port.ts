import type { UserPrincipal } from "@core/auth";
import type { WalkingPet } from "../../walk/domain/walking-record.js";
export abstract class WalkingAccountPort {
  abstract owner(
    user: UserPrincipal,
  ): Promise<{ nickname: string; pets: WalkingPet[] }>;
}
