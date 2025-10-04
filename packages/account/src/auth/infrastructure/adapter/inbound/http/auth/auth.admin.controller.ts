import { Body, Controller, Post, Res, UseGuards } from "@nestjs/common";
import { AdminSigninRequestBody } from "./dto/request/admin-signin.request";
import { CommandBus } from "@nestjs/cqrs";
import { AdminLoginCommand } from "@app/auth/application/port/command/admin-login.port";
import { AuthToken } from "@app/auth/domain/model/auth-token";
import { Response } from "express";
import { ApiOperation, ApiResponse } from "@nestjs/swagger";

@Controller('admin/auth')
export class AdminAuthController {

    constructor(
        private readonly commandBus : CommandBus
    ) {}

    @Post('signin')
    @ApiOperation({ summary : '관리자 로그인 (ID,PWD)'})
    @ApiResponse({ status : 201 , type : () => AuthToken ,description : '관리자 토큰'})  
    async singIn(
        @Body() body : AdminSigninRequestBody,
        @Res() res : Response,
    ) {
        const token = await this.commandBus.execute(new AdminLoginCommand(body.id,body.password));
        res.cookie('accessToken', token.getAccessToken(), {
            httpOnly: true,
            secure: true,
            sameSite: 'strict',
            maxAge: token.getExpiresIn(),
        });
        res.cookie('refreshToken', token.getRefreshToken(), {
            httpOnly: true,
            secure: true,
            sameSite: 'strict',
            maxAge: token.getRefreshTokenExpiresIn(),
        });
      
        res.json(token);
    }
}