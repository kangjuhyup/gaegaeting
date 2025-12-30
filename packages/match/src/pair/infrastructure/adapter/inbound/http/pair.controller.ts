import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from "@nestjs/common";
import { AccessGuard, UserParam, UserPrincipal } from "@core/auth";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { GetPairResponse } from "./dto/get-pair.response";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import { GetPairsQuery } from "@app/pair/applicatoin/port/query/get-pairs.port";
import { CancelPairCommand } from "@app/pair/applicatoin/port/command/cancel-pair.port";
import { ReportPairCommand } from "@app/pair/applicatoin/port/command/report-pair.port";
import { ReportPairBody } from "./dto/request/report-pair.request";

@ApiTags('Match', 'Pair')
@Controller('pair')
@UseGuards(AccessGuard) // 컨트롤러 전체에 가드 설정 
export class PairController {

    constructor(
        private readonly queryBus : QueryBus,
        private readonly commandBus : CommandBus
    ) {}

    @Get()
    @ApiOperation({ summary : '짝이된 매치 목록 조회' })
    @ApiBearerAuth('access-token')
    async getPairList(
        @UserParam() user : UserPrincipal
    ) : Promise<GetPairResponse> {
        const pairs = await this.queryBus.execute(new GetPairsQuery(user))
        return GetPairResponse.of(pairs)
    }

    @Delete(':id')
    @ApiOperation({ summary : '매치 취소' })
    @ApiBearerAuth('access-token')
    async unPair(
        @UserParam() user : UserPrincipal,
        @Param('id') id : string
    ) {
        await this.commandBus.execute(new CancelPairCommand(user,Number(id)))
    }

    @Put('report/:id')
    @ApiOperation({ summary : '매치 신고' })
    @ApiBearerAuth('access-token')
    async reportPair(
        @UserParam() user : UserPrincipal,
        @Param('id') id : string,
        @Body() body : ReportPairBody
    ) {
        await this.commandBus.execute(new ReportPairCommand(user,Number(id),body.reason))
    }
}