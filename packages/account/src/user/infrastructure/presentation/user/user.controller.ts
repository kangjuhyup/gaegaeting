import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Delete,
  HttpCode,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { CreateUserBody } from "./dto/request/create-user.request";
import { UpdateUserBody } from "./dto/request/update-user.request";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import { CreateUserCommand } from "@app/user/application/port/in/command/create-user.port";
import { UpdateUserCommand } from "@app/user/application/port/in/command/update-user.port";
import { GetUserQuery } from "@app/user/application/port/in/query/get-user.port";
import { UserResponse } from "./dto/response/user.response";
import { DeleteUserCommand } from "@app/user/application/port/in/command/delete-user.port";
import { AccessGuard,UserGuard, UserParam, UserPrincipal, AuthProviderParam, AuthProviderPrincipal } from "@core/auth";
import { GetPresignedUrlResponse } from "./dto/response/get-presgined.response";
import { GeneratePresignedCommand } from "@app/user/application/port/in/command/generate-presigned.port";

@ApiTags('Account','User')
@Controller("users")
export class UserController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
  ) {}
  
  @Get("/me")
  @ApiOperation({ summary : '내 프로필 조회' })
  @ApiResponse({ status : 200, type : () => UserResponse })
  @ApiBearerAuth('access-token')
  @UseGuards(AccessGuard,UserGuard)
  async getMyProfile(
    @UserParam() user: UserPrincipal
  ) {
    const userProfile = await this.queryBus.execute(new GetUserQuery(user.userId));
    return UserResponse.fromDomain(userProfile);
  }

  /**
   * 사용자 생성 API
   * @param body 사용자 생성 DTO
   * @returns 생성된 사용자 정보
   */
  @Post("/me")
  @ApiOperation({ summary : '내 프로필 생성' })
  @ApiResponse({ status : 201, type : () => UserResponse })
  @ApiBearerAuth('access-token')
  @UseGuards(AccessGuard)
  async createMyProfile(
    @AuthProviderParam() authProvider: AuthProviderPrincipal,
    @Body() body: CreateUserBody
  ) {
    const user = await this.commandBus.execute(new CreateUserCommand(authProvider,body.toDomain()));
    return UserResponse.fromDomain(user);
  }  

  /** 
   * 사용자 정보 업데이트 API
   * @param id 사용자 ID
   * @param updateUserDto 사용자 업데이트 DTO
   * @returns 업데이트된 사용자 정보
   */
  @Put("/me")
  @ApiOperation({ summary : '내 프로필 수정' })
  @ApiResponse({ status : 200, type : () => UserResponse })
  @ApiBearerAuth('access-token')
  @UseGuards(AccessGuard,UserGuard)
  async updateUser(
    @Param("id") id: string,
    @Body() body: UpdateUserBody,
  ): Promise<UserResponse> {
      const user = await this.commandBus.execute(new UpdateUserCommand(id, body));
      return UserResponse.fromDomain(user);
  }

  /**
   * 프로필 이미지 업로드 URL 생성 API
   * @param user 
   * @param query 
   * @returns 
   */
  @Get('me/presign/:no')
  @ApiOperation({ summary : '프로필 이미지 업로드 URL 생성' })
  @ApiResponse({ status : 200, type : () => GetPresignedUrlResponse })
  @ApiBearerAuth('access-token')
  @UseGuards(AccessGuard,UserGuard)
  async getPresignedUrl(
    @UserParam() user: UserPrincipal,
    @Param() no : string
  ) : Promise<GetPresignedUrlResponse> {
    const presignedUrl = await this.commandBus.execute(new GeneratePresignedCommand(user.userId,Number(no)));
    return GetPresignedUrlResponse.from(presignedUrl);
  }

  /**
   * 특정 사용자 조회 API
   * @param id 사용자 ID
   * @returns 사용자 정보
   */
  @Get(":id")
  @ApiOperation({ summary : '특정 사용자 조회' })
  @ApiResponse({ status : 200, type : () => UserResponse })
  async getUser(@Param("id") id: string): Promise<UserResponse> {
    const user = await this.queryBus.execute(new GetUserQuery(id));
    return UserResponse.fromDomain(user);
  }

  /**
   * 사용자 삭제 API
   * @param id 사용자 ID
   * @returns 삭제 결과 (204 No Content)
   */
  @Delete()
  @ApiOperation({ summary : '내 계정 삭제' })
  @ApiResponse({ status : 204, description: '계정 삭제 성공' })
  @ApiBearerAuth('access-token')
  @HttpCode(204)
  async deleteUser(
    @UserParam() user : UserPrincipal
  ): Promise<void> {
    await this.commandBus.execute(new DeleteUserCommand(user.userId));
    return;
  }
}
