import { Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { AccessGuard, UserGuard, UserParam, UserPrincipal } from '@core/auth';
import { GetRoomQuery } from '@app/room/application/port/query/get-room.port';
import { GetUserRoomsQuery } from '@app/room/application/port/query/get-user-rooms.port';
import { GetRoomByPairQuery } from '@app/room/application/port/query/get-room-by-pair.port';
import { JoinRoomCommand } from '@app/room/application/port/command/join-room.port';
import { LeaveRoomCommand } from '@app/room/application/port/command/leave-room.port';

@ApiTags('Chat', 'Room')
@Controller('rooms')
export class RoomController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus
  ) {}

  // Room 생성은 Match에서 Pair 생성 시 카프카를 통해 자동으로 이루어짐
  // 직접 Room 생성 API는 제거

  @Get('/me')
  @ApiOperation({ summary: '내 채팅방 목록 조회' })
  @ApiResponse({ status: 200, description: '채팅방 목록 조회 성공' })
  @ApiBearerAuth('access-token')
  @UseGuards(AccessGuard, UserGuard)
  async getUserRooms(@UserParam() user: UserPrincipal) {
    const rooms = await this.queryBus.execute(
      new GetUserRoomsQuery(user.userId)
    );
    return rooms;
  }

  @Get('/:id')
  @ApiOperation({ summary: '채팅방 상세 조회' })
  @ApiResponse({ status: 200, description: '채팅방 조회 성공' })
  @ApiBearerAuth('access-token')
  @UseGuards(AccessGuard, UserGuard)
  async getRoom(@Param('id') id: string) {
    const room = await this.queryBus.execute(new GetRoomQuery(Number(id)));
    return room;
  }

  @Get('/pair/:pairId')
  @ApiOperation({ summary: 'Pair ID로 채팅방 조회' })
  @ApiResponse({ status: 200, description: '채팅방 조회 성공' })
  @ApiBearerAuth('access-token')
  @UseGuards(AccessGuard, UserGuard)
  async getRoomByPair(@Param('pairId') pairId: string) {
    const room = await this.queryBus.execute(new GetRoomByPairQuery(Number(pairId)));
    return room;
  }

  @Post('/:id/join')
  @ApiOperation({ summary: '채팅방 참가' })
  @ApiResponse({ status: 200, description: '채팅방 참가 성공' })
  @ApiBearerAuth('access-token')
  @UseGuards(AccessGuard, UserGuard)
  async joinRoom(
    @Param('id') id: string,
    @UserParam() user: UserPrincipal
  ) {
    await this.commandBus.execute(new JoinRoomCommand(Number(id), user.userId));
    return { success: true };
  }

  @Post('/:id/leave')
  @ApiOperation({ summary: '채팅방 나가기' })
  @ApiResponse({ status: 200, description: '채팅방 나가기 성공' })
  @ApiBearerAuth('access-token')
  @UseGuards(AccessGuard, UserGuard)
  async leaveRoom(
    @Param('id') id: string,
    @UserParam() user: UserPrincipal
  ) {
    await this.commandBus.execute(new LeaveRoomCommand(Number(id), user.userId));
    return { success: true };
  }

  @Delete(':id')
  @ApiOperation({ summary: '채팅 취소' })
  @ApiBearerAuth('access-token')
  @UseGuards(UserGuard)
  async removeRoom(
    @Param('id') roomId: string
  ) {
    // TODO: Implement room removal logic
  }
}