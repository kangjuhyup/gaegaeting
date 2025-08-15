import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Delete,
  HttpCode,
} from "@nestjs/common";
import { CreateUserBody } from "./dto/request/create-user.request";
import { UpdateUserBody } from "./dto/request/update-user.request";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import { CreateUserCommand } from "@app/user/application/port/in/command/create-user.port";
import { UpdateUserCommand } from "@app/user/application/port/in/command/update-user.port";
import { GetUserQuery } from "@app/user/application/port/in/query/get-user.port";
import { UserResponse } from "./dto/response/user.response";
import { DeleteUserCommand } from "@app/user/application/port/in/command/delete-user.port";

/**
 * 사용자 컨트롤러
 *
 * 사용자 관련 HTTP 요청을 처리하는 컨트롤러입니다.
 */
@Controller("users")
export class UserController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
  ) {}

  @Get("/me")
  async getMyProfile() {

  }

  /**
   * 사용자 생성 API
   * @param body 사용자 생성 DTO
   * @returns 생성된 사용자 정보
   */
  @Post("/me")
  async createMyProfile(@Body() body: CreateUserBody) {
    const user = await this.commandBus.execute(new CreateUserCommand(body.toDomain()));
    return UserResponse.fromDomain(user);
  }  

  /**
   * 사용자 정보 업데이트 API
   * @param id 사용자 ID
   * @param updateUserDto 사용자 업데이트 DTO
   * @returns 업데이트된 사용자 정보
   */
  @Put("/me")
  async updateUser(
    @Param("id") id: string,
    @Body() body: UpdateUserBody,
  ): Promise<UserResponse> {
      const user = await this.commandBus.execute(new UpdateUserCommand(id, body));
      return UserResponse.fromDomain(user);
  }

  /**
   * 특정 사용자 조회 API
   * @param id 사용자 ID
   * @returns 사용자 정보
   */
  @Get(":id")
  async getUser(@Param("id") id: string): Promise<UserResponse> {
    const user = await this.queryBus.execute(new GetUserQuery(id));
    return UserResponse.fromDomain(user);
  }

  

  /**
   * 사용자 삭제 API
   * @param id 사용자 ID
   * @returns 삭제 결과 (204 No Content)
   */
  @Delete(":id")
  @HttpCode(204)
  async deleteUser(@Param("id") id: string): Promise<void> {
    await this.commandBus.execute(new DeleteUserCommand(id));
    return;
  }
}
