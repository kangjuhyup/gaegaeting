import { Controller, Delete, Get, Param, Post, UseGuards } from "@nestjs/common";
import { AccessGuard, UserGuard, UserParam, UserPrincipal } from "@core/auth";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

@ApiTags('Match', 'Pair')
@Controller('pair')
@UseGuards(AccessGuard,UserGuard) // 컨트롤러 전체에 가드 설정 
export class PairController {

    @Get()
    @ApiOperation({ summary : '짝이된 매치 목록 조회' })
    @ApiBearerAuth('access-token')
    async getPairList(
        @UserParam() user : UserPrincipal
    ){
        
    }

    @Post('chat/:id')
    @ApiOperation({ summary : '매치 채팅방 시작' })
    @ApiBearerAuth('access-token')
    async openChat(
        @UserParam() user : UserPrincipal,
        @Param('id') id : string
    ) {
        
    }

    @Delete(':id')
    @ApiOperation({ summary : '매치 취소' })
    @ApiBearerAuth('access-token')
    async unPair(
        @UserParam() user : UserPrincipal,
        @Param('id') id : string
    ) {
        
    }

    @Post('report')
    @ApiOperation({ summary : '매치 신고' })
    @ApiBearerAuth('access-token')
    async reportPair(
        @UserParam() user : UserPrincipal,
    ) {
        
    }
}