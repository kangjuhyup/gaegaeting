import { Controller, Post, Param, Delete, Get, UseGuards } from "@nestjs/common";
import { AccessGuard, UserParam, UserPrincipal } from "@core/auth";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import { CancelLikeCommand } from "@app/like/application/port/command/cancel-like.port";
import { GetLikeInQuery } from "@app/like/application/port/query/get-like-in.query";
import { GetLikeOutQuery } from "@app/like/application/port/query/get-like-out.query";
import { AcceptLikeCommand } from "@app/like/application/port/command/accept-like.command";
import { GetLikeResponse } from "./dto/get-like.response";

@ApiTags('Match','Like')
@Controller('like')
@UseGuards(AccessGuard) // 컨트롤러 전체에 가드 설정 
export class LikeController {

    constructor(
        private readonly queryBus : QueryBus,
        private readonly commandBus : CommandBus
    ) {}

    @Post(':id')
    @ApiOperation({ summary : '내가 받은 Like 수락'})
    @ApiBearerAuth('access-token')
    async like(
        @UserParam() user : UserPrincipal,
        @Param('id') id : string
    ) {
        await this.commandBus.execute(new AcceptLikeCommand(user,Number(id)))
    }

    @Delete(':id')
    @ApiOperation({ summary : '내가 받은 Like 거절'})
    @ApiBearerAuth('access-token')
    async unlike(
        @UserParam() user : UserPrincipal,
        @Param('id') id : string
    ) {
        await this.commandBus.execute(new CancelLikeCommand(user,Number(id)))
    }

    @Get('out')
    @ApiOperation({ summary : '내가 한 Like 목록 조회'})
    @ApiBearerAuth('access-token')
    async getLikeOutList(
        @UserParam() user : UserPrincipal,
    ) : Promise<GetLikeResponse> {
        const likes = await this.queryBus.execute(new GetLikeOutQuery(user))
        return GetLikeResponse.of(likes)
    }

    @Get('in')
    @ApiOperation({ summary : '내가 받은 Like 목록 조회'})
    @ApiBearerAuth('access-token')
    async getLikeInList(
        @UserParam() user : UserPrincipal,
    ) : Promise<GetLikeResponse> {
        const likes = await this.queryBus.execute(new GetLikeInQuery(user))
        return GetLikeResponse.of(likes)
    }
}