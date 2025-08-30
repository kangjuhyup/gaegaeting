import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { AccessGuard, UserGuard, UserParam, UserPrincipal } from '@core/auth';
import { SendMessageCommand } from '@app/message/application/port/command/send-message.port';
import { GetMessagesQuery } from '@app/message/application/port/query/get-messages.port';

@ApiTags('Chat', 'Message')
@Controller('messages')
export class MessageController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus
  ) {}

  @Post()
  @ApiOperation({ summary: '메시지 전송' })
  @ApiResponse({ status: 201, description: '메시지 전송 성공' })
  @ApiBearerAuth('access-token')
  @UseGuards(AccessGuard, UserGuard)
  async sendMessage(
    @UserParam() user: UserPrincipal,
    @Body() body: { roomId: number; body: string }
  ) {
    const message = await this.commandBus.execute(
      new SendMessageCommand(body.roomId, user.userId, body.body)
    );
    return message;
  }

  @Get('/rooms/:roomId')
  @ApiOperation({ summary: '채팅방 메시지 목록 조회' })
  @ApiResponse({ status: 200, description: '메시지 목록 조회 성공' })
  @ApiBearerAuth('access-token')
  @UseGuards(AccessGuard, UserGuard)
  async getMessages(
    @Param('roomId') roomId: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string
  ) {
    const messages = await this.queryBus.execute(
      new GetMessagesQuery(
        Number(roomId),
        limit ? Number(limit) : 20,
        cursor ? Number(cursor) : undefined
      )
    );
    return messages;
  }
}