import { Body, Controller, Put, UseGuards } from "@nestjs/common";
import { ActivityCommands } from "../../application/activity.commands.js";
import { ChallengeServiceGuard } from "../../../shared/infrastructure/http/challenge-service.guard.js";
import { ActivityInput } from "./activity.input.js";

@Controller("internal/v1")
@UseGuards(ChallengeServiceGuard)
export class ActivityController {
  constructor(private readonly commands: ActivityCommands) {}

  @Put("activities")
  async record(@Body() input: ActivityInput) {
    return {
      result: await this.commands.recordActivity({
        ...input,
        facts: input.facts ?? null,
      }),
    };
  }
}
