import { Controller, Get, Param, Post, Put } from "@nestjs/common";
import { UserParam, UserPrincipal } from "@core/auth";
import { ApiOperation } from "@nestjs/swagger";

@Controller('feed')
export class FeedController {

    @ApiOperation({ summary : '피드 상세 조회'})
    @Get('/:id')
    async getFeed(
        @UserParam() user : UserPrincipal,
        @Param('id') id : string
    ){
        
    }

    @ApiOperation({ summary : '일일 피드 목록 조회'})
    @Get('/daily')
    async getDailyFeed(
        @UserParam() user : UserPrincipal,
    ){
        
    }

    @ApiOperation({ summary : '피드아이템 상태 변경(조회,라이크,패스,신고)'})
    @Post('/:feedItemId/:action')
    async actionFeed(
        @UserParam() user : UserPrincipal,
        @Param('feedItemId') feedItemId : string,
        @Param('action') action : string
    ){
        
    }
}