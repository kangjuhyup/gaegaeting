import { Controller, Post, Param, Delete, Get, UseGuards } from "@nestjs/common";
import { AccessGuard, UserGuard, UserParam, UserPrincipal } from "@core/auth";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

@ApiTags('Match','Like')
@Controller('like')
@UseGuards(AccessGuard,UserGuard) // 컨트롤러 전체에 가드 설정 
export class LikeController {

    @Delete(':id')
    @ApiOperation({ summary : '기존 Like 취소'})
    @ApiBearerAuth('access-token')
    async unlike(
        @UserParam() user : UserPrincipal,
        @Param('id') id : string
    ) {
        
    }

    @Get('out')
    @ApiOperation({ summary : '내가 한 Like 목록 조회'})
    @ApiBearerAuth('access-token')
    async getLikeList(
        @UserParam() user : UserPrincipal,
    ) {
        
    }

    @Get('in')
    @ApiOperation({ summary : '내가 받은 Like 목록 조회'})
    @ApiBearerAuth('access-token')
    async getLikeInList(
        @UserParam() user : UserPrincipal,
    ) {
        
    }
}