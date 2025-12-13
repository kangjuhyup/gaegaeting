import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, UseGuards } from "@nestjs/common";
import { ReviewUserImagesRequestBody } from "./dto/request/review-user-images";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import { GetUserProfileQuery } from "@app/user/application/port/query/get-user-profile.port";
import { UserResponse } from "./dto/response/user.response";
import { ReviewUserImageCommand } from "@app/user/application/port/command/review-user-image.port";
import { AccessGuard } from "@core/auth";
import { ApiBearerAuth, ApiOperation, ApiResponse } from "@nestjs/swagger";

@Controller('/admin/users')
@UseGuards(AccessGuard)
export class AdminUserContorller {

    constructor(
        private readonly queryBus : QueryBus,
        private readonly commandBus : CommandBus
    ) {}

    @Get('/:userId')
    @ApiOperation({ summary : '관리자 유저 조회' })
    @ApiResponse({ status : 200, type : () => UserResponse })
    @ApiBearerAuth('admin-token')
    async getUser(
        @Param('userId') userId : string
    ) {
        const user = await this.queryBus.execute(new GetUserProfileQuery(userId))
        return UserResponse.fromDomain(user.profile, user.profileImages)
    }

    @Patch('images/:userId')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary : '유저 사진 허가/거부' })
    @ApiResponse({ status : 204 })
    @ApiBearerAuth('admin-token')
    async reviewUserImage(
        @Param('userId') userId : string,
        @Body() body : ReviewUserImagesRequestBody
    ) {
        await this.commandBus.execute(new ReviewUserImageCommand(userId,body.path,body.approve))
        return
    }

}