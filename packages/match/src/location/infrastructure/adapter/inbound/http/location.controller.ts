import { SetMainAreaCommand } from "@app/location/application/port/command/set-main-area.port";
import { AccessGuard, UserGuard, UserParam, UserPrincipal } from "@core/auth";
import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { SetMainAreaBody } from "./dto/request/set-main-area.request";
import { GetMainAreaQuery } from "@app/location/application/port/query/get-main-area.port";
import { SetLocationCommand } from "@app/location/application/port/command/set-location.port";
import { SetLocationBody } from "./dto/request/set-location.request";
import { GetMainAreaResponse } from "./dto/response/get-main-area.request";

@ApiTags('Match','Location')
@Controller('location')
@UseGuards(AccessGuard,UserGuard) // 컨트롤러 전체에 가드 설정 
export class LocationController {

    constructor(
        private readonly commandBus : CommandBus,
        private readonly queryBus : QueryBus
    ) {}

    @ApiOperation({ summary : '주 활동지역 설정' })
    @ApiBearerAuth('access-token')
    @Post('/main')
    async setMainArea(
        @UserParam() user : UserPrincipal,
        @Body() body : SetMainAreaBody
    ) {
        await this.commandBus.execute(new SetMainAreaCommand(user,body.code,body.name,body.parentCode))
        return true;
    }

    @Post('/current')
    @ApiOperation({ summary : '현재 위치 설정(앱 활성화시 요청)'})
    @ApiBearerAuth('access-token')
    async setCurrentLocation(
        @UserParam() user : UserPrincipal, 
        @Body() body : SetLocationBody
    ) {
        await this.commandBus.execute(new SetLocationCommand(user,body.toModel()))
        return true;
    }

    @ApiOperation({ summary : '주 활동지역 조회' })
    @ApiBearerAuth('access-token')
    @Get('/main')
    async getMainArea(@UserParam() user : UserPrincipal) : Promise<GetMainAreaResponse> {
        const mainArea = await this.queryBus.execute(new GetMainAreaQuery(user))
        return GetMainAreaResponse.fromModel(mainArea)
    }
}