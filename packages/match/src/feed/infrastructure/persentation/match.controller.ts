import { Controller, Get, Post, Put } from "@nestjs/common";
import { UserParam, UserPrincipal } from "@core/auth";

@Controller('feed')
export class FeedController {

    @Put('/location')
    async updateLocation(
        @UserParam() user : UserPrincipal
    ){
        
    }

    @Get()
    async getFeedList(
        @UserParam() user : UserPrincipal
    ){
        
    }

    @Post('like')
    async likeMatch(
        @UserParam() user : UserPrincipal
    ){
        
    }

    @Post('dislike')
    async dislikeMatch(
        @UserParam() user : UserPrincipal
    ){
        
    }
}