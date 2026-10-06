import {
  BadRequestException,
  Controller,
  Delete,
  HttpCode,
  Param,
  UseGuards,
} from "@nestjs/common";
import { ChallengeServiceGuard } from "../shared/infrastructure/http/challenge-service.guard.js";
import { DeleteChallengeUserDataCommand } from "./delete-challenge-user-data.command.js";

@Controller("internal/v1/users")
@UseGuards(ChallengeServiceGuard)
export class ChallengeUserDataController {
  constructor(
    private readonly deleteUserData: DeleteChallengeUserDataCommand,
  ) {}

  @Delete(":userId")
  @HttpCode(204)
  async deleteUser(@Param("userId") userId: string) {
    if (!/^[A-Za-z0-9_-]{1,26}$/.test(userId))
      throw new BadRequestException("사용자 식별자가 올바르지 않습니다.");
    await this.deleteUserData.execute(userId);
  }
}
