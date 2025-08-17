import { AccessGuard, UserGuard, UserParam, UserPrincipal } from "@core/auth";
import { Controller, Get, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

@ApiTags('Match','Location')
@Controller('location')
@UseGuards(AccessGuard,UserGuard) // 컨트롤러 전체에 가드 설정 
export class LocationController {

    @ApiOperation({ summary : '주 활동지역 설정' })
    @ApiBearerAuth('access-token')
    @Post('/main')
    async setMainArea(@UserParam() user : UserPrincipal) {
        
    }

    @Post('/current')
    @ApiOperation({ summary : '현재 위치 설정(앱 활성화시 요청)'})
    @ApiBearerAuth('access-token')
    async setCurrentLocation(@UserParam() user : UserPrincipal) {
        
    }

    @ApiOperation({ summary : '주 활동지역 조회' })
    @ApiBearerAuth('access-token')
    @Get('/main')
    async getMainArea(@UserParam() user : UserPrincipal) {
        
    }
}