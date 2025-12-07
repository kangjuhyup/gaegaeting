import { UserUsecase, CreateUserInput, UpdateUserInput } from '@app/application/usecase/user.usecase';
import { SessionUsecase } from '@app/application/usecase/session.usecase';
import { UserStatus } from '@core/database';
import { Controller, Get, Post, Put, Delete, Body, Param, Query, Patch } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Admin - User')
@ApiBearerAuth('admin-token')
@Controller('admin/v1/users')
export class UserAdminController {
  constructor(
    private readonly userUsecase: UserUsecase,
    private readonly sessionUsecase: SessionUsecase,
  ) {}

  @Post()
  @ApiOperation({ summary: '사용자 생성' })
  async createUser(@Body() dto: CreateUserInput) {
    return await this.userUsecase.createUser(dto);
  }

  @Get()
  @ApiOperation({ summary: '사용자 목록 조회' })
  async listUsers(
    @Query('tenantId') tenantId: string,
    @Query('status') status?: UserStatus,
    @Query('search') search?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return await this.userUsecase.listUsers({ tenantId, status, search, page, limit });
  }

  @Get(':userId')
  @ApiOperation({ summary: '사용자 상세 조회' })
  async getUser(@Param('userId') userId: string) {
    const user = await this.userUsecase.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }

  @Put(':userId')
  @ApiOperation({ summary: '사용자 수정' })
  async updateUser(@Param('userId') userId: string, @Body() dto: UpdateUserInput) {
    return await this.userUsecase.updateUser(userId, dto);
  }

  @Delete(':userId')
  @ApiOperation({ summary: '사용자 삭제' })
  async deleteUser(@Param('userId') userId: string) {
    await this.userUsecase.deleteUser(userId);
    return { success: true };
  }

  @Patch(':userId/status')
  @ApiOperation({ summary: '사용자 상태 변경' })
  async updateUserStatus(@Param('userId') userId: string, @Body('status') status: UserStatus) {
    return await this.userUsecase.updateUserStatus(userId, status);
  }

  @Post(':userId/reset-password')
  @ApiOperation({ summary: '비밀번호 강제 리셋' })
  async resetPassword(@Param('userId') userId: string) {
    return await this.userUsecase.resetPassword(userId);
  }

  @Get(':userId/sessions')
  @ApiOperation({ summary: '사용자 활성 세션 조회' })
  async getUserSessions(@Param('userId') userId: string) {
    const sessions = await this.sessionUsecase.getUserSessions(userId);
    return { sessions };
  }

  @Delete(':userId/sessions')
  @ApiOperation({ summary: '사용자 모든 세션 종료' })
  async terminateAllSessions(@Param('userId') userId: string) {
    const result = await this.sessionUsecase.terminateAllUserSessions(userId);
    return { success: true, terminated: result.terminated };
  }
}

