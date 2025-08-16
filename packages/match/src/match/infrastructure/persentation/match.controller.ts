import { Controller, Delete, Get, Param, Post } from "@nestjs/common";
import { UserParam, UserPrincipal } from "@core/auth";

@Controller('match')
export class MatchController {

    @Get()
    async getMatchList(
        @UserParam() user : UserPrincipal
    ){
        
    }

    @Delete(':id')
    async unMatch(
        @UserParam() user : UserPrincipal,
        @Param('id') id : string
    ) {
        
    }

    @Post('report')
    async reportMatch(
        @UserParam() user : UserPrincipal,
    ) {
        
    }
}