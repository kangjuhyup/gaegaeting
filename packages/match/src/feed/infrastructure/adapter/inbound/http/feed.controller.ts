import { Body, Controller, Get, Param, Post, Put, UseGuards } from "@nestjs/common";
import { AccessGuard, UserGuard, UserParam, UserPrincipal } from "@core/auth";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { GetDailyFeedResponse } from "./dto/response/get-daily-feed.response";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import { GetMyFeedQuery } from "@app/feed/application/port/query/get-my-feed.port";
import { ActionFeedBody } from "./dto/request/action-feed.request";
import { UpdateFeedItemStatusCommand } from "@app/feed/application/port/command/update-feed-status.port";
import { FeedItemStatus } from "@app/feed/domain/enum/feed-item-status.enum";

@ApiTags('Match','Feed')
@Controller('feed')
@UseGuards(AccessGuard,UserGuard) // 컨트롤러 전체에 가드 설정 
export class FeedController {

    constructor(
        private readonly queryBus : QueryBus,
        private readonly commandBus : CommandBus
    ) {}

    @Post()
    @ApiOperation({ summary : '피드 생성' })
    @ApiBearerAuth('access-token')
    async createFeed(
        @UserParam() user : UserPrincipal
    ) {
        
    }

    @Get('/daily')
    @ApiOperation({ summary : '일일 피드 목록 조회'})
    @ApiBearerAuth('access-token')
    async getDailyFeed(
        @UserParam() user : UserPrincipal,
    ) : Promise<GetDailyFeedResponse> {
        const feedList = await this.queryBus.execute(new GetMyFeedQuery(user))
        await Promise.allSettled(
            feedList.map(feed =>
              this.commandBus.execute(
                new UpdateFeedItemStatusCommand(user, feed.id, FeedItemStatus.VIEW),
              ),
            ),
        )
        return GetDailyFeedResponse.from(feedList)
    }

    @Put('/:feedItemId')
    @ApiOperation({ summary : '피드아이템 상태 변경(조회,라이크,패스,신고)'})
    @ApiBearerAuth('access-token')
    async actionFeed(
        @UserParam() user : UserPrincipal,
        @Param('feedItemId') feedItemId : string,
        @Body() actionFeedBody : ActionFeedBody,
    ){
        await this.commandBus.execute(new UpdateFeedItemStatusCommand(user,Number(feedItemId),actionFeedBody.action))
        return
    }
}