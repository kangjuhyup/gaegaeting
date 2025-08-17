import { Controller, Get, Param, Post, Put, UseGuards } from "@nestjs/common";
import { AccessGuard, UserGuard, UserParam, UserPrincipal } from "@core/auth";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

@ApiTags('Match','Feed')
@Controller('feed')
@UseGuards(AccessGuard,UserGuard) // 컨트롤러 전체에 가드 설정 
export class FeedController {

    @Get('/:id')
    @ApiOperation({ summary : '피드 상세 조회'})
    @ApiBearerAuth('access-token')
    async getFeed(
        @UserParam() user : UserPrincipal,
        @Param('id') id : string
    ){
        
    }

    @Get('/daily')
    @ApiOperation({ summary : '일일 피드 목록 조회'})
    @ApiBearerAuth('access-token')
    async getDailyFeed(
        @UserParam() user : UserPrincipal,
    ){
        
    }

    @Post('/:feedItemId/:action')
    @ApiOperation({ summary : '피드아이템 상태 변경(조회,라이크,패스,신고)'})
    @ApiBearerAuth('access-token')
    async actionFeed(
        @UserParam() user : UserPrincipal,
        @Param('feedItemId') feedItemId : string,
        @Param('action') action : string
    ){
        
    }
}