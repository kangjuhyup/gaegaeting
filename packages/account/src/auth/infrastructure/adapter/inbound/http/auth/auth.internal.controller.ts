import { Body, Controller, Post, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CommandBus } from '@nestjs/cqrs';
import { CreateTokenForUserCommand } from '@app/auth/application/port/command/create-token-for-user.port';
import { UpdateUserIdCommand } from '@app/auth/application/port/command/update-user-id.port';
import { UpdateUserIdRequestBody } from './dto/request/update-user-id.request';
import { CreateTokenRequestBody } from './dto/request/create-token.request';

@ApiTags('Account','Auth','Internal')
@Controller('internal/auth')
export class AuthInternalController {
  constructor(private readonly commandBus: CommandBus) {}

  /**
   * 내부 서비스용 토큰 발급 엔드포인트
   * 사용자 생성 후 액세스 토큰을 발급받기 위해 사용
   */
  @Post('tokens')
  async createTokenForUser(@Body() body: CreateTokenRequestBody) {
    const accessToken = await this.commandBus.execute(
      new CreateTokenForUserCommand(
        body.userId,
        body.socialProvider,
        body.socialId,
        {
          profileRegistered: body.profileRegistered,
          phoneVerified: body.phoneVerified,
          petRegistered: body.petRegistered,
        },
      ),
    );

    return { accessToken };
  }

  /**
   * 내부 서비스용 userId 업데이트 엔드포인트
   * 사용자 생성 후 Auth 엔티티에 userId를 설정하기 위해 사용
   */
  @Put('users')
  async updateUserId(@Body() body: UpdateUserIdRequestBody) {
    await this.commandBus.execute(
      new UpdateUserIdCommand(body.providerType, body.providerId, body.userId),
    );
    return { success: true };
  }
}
