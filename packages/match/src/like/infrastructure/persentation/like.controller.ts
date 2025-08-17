import { Controller, Post, Param, Delete, Get } from "@nestjs/common";
import { UserParam, UserPrincipal } from "@core/auth";
import { ApiOperation } from '@nestjs/swagger';

@Controller('like')
export class LikeController {

    @ApiOperation({ summary : 'Like 전송'})
    @Post('like/:feedItemId')
    async like(
        @UserParam() user : UserPrincipal,
        @Param('feedItemId') feedItemId : string
    ) {
        
    }

    @ApiOperation({ summary : '기존 Like 취소'})
    @Delete('like/:id')
    async unlike(
        @UserParam() user : UserPrincipal,
        @Param('id') id : string
    ) {
        
    }

    @ApiOperation({ summary : '내가 한 Like 목록 조회'})
    @Get('like/in')
    async getLikeList(
        @UserParam() user : UserPrincipal,
    ) {
        
    }

    @ApiOperation({ summary : '내가 받은 Like 목록 조회'})
    @Get('like/in')
    async getLikeInList(
        @UserParam() user : UserPrincipal,
    ) {
        
    }
}