import { Controller, Delete, Get, Param, Post } from "@nestjs/common";
import { UserParam, UserPrincipal } from "@core/auth";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

@ApiTags('Match', 'Pair')
@Controller('pair')
export class PairController {

    @ApiOperation({ summary : '짝이된 매치 목록 조회' })
    @Get()
    async getPairList(
        @UserParam() user : UserPrincipal
    ){
        
    }

    @ApiOperation({ summary : '매치 채팅방 시작' })
    @Post('chat/:id')
    async openChat(
        @UserParam() user : UserPrincipal,
        @Param('id') id : string
    ) {
        
    }

    @ApiOperation({ summary : '매치 취소' })
    @Delete(':id')
    async unPair(
        @UserParam() user : UserPrincipal,
        @Param('id') id : string
    ) {
        
    }

    @ApiOperation({ summary : '매치 신고' })
    @Post('report')
    async reportPair(
        @UserParam() user : UserPrincipal,
    ) {
        
    }
}