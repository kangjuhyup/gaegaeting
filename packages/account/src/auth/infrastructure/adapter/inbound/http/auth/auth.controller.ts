import { Body, Controller, Get, Param, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { SocialRedirectQuery } from '@app/auth/application/port/query/social-redirect.port';
import { SocialLoginCommand } from '@app/auth/application/port/command/social-login.port';
import { SocialCallbackDto } from './dto/request/social-callback.dto';
import { LoginResponse } from './dto/response/login.response';
import { SocialProviderDto } from './dto/request/social-provider.dto';
import { GetUserPrincipalRequest } from './dto/request/get-user-principal.request';
import { GetUserPrincipalResponse } from './dto/response/get-user-principal.response';
import { GetUserPrincipalQuery } from '@app/auth/application/port/query/get-user-principal.port';
import { ApiOperation, ApiProperty, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SocialLoginNativeBody, SocialLogInNativeParam } from './dto/request/social-native.request';
import { SocialLoginByTokenCommand } from '@app/auth/application/port/command/social-login-by-token.port';
import { SendOptMessageBody } from './dto/request/send-opt-message.request';
import { VerifyOptMessageBody } from './dto/request/verify-opt-message.request';
import { SendOptMessageCommand } from '@app/auth/application/port/command/send-otp-message.port';
import { SendOptMessageResponse } from './dto/response/send-opt-message.response';
import { VerifyOptMessageResponse } from './dto/response/verify-opt-message.response';
import { VerifyOtpMessageCommand } from '@app/auth/application/port/command/verify-otp-message.port';
import { AccessGuard, UserGuard, UserParam, UserPrincipal } from '@core/auth';

@ApiTags('Account','Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly queryBus : QueryBus,
    private readonly commandBus : CommandBus,
  ) {}
  
  @Get(':provider')
  @ApiOperation({ summary : '소셜 로그인 페이지 요청' })
  @ApiResponse({ status : 302 , description : '소셜로그인 페이지 리다이렉트'})async getSocialLoginPage(
    @Param() providerDto: SocialProviderDto,
    @Req() req: Request, 
    @Res() res: Response
  ): Promise<void> {
    
    const url = await this.queryBus.execute(
      new SocialRedirectQuery(
        providerDto.provider.value, 
        `${req.protocol}://${req.get('host')}/auth/${providerDto.provider.label.toLowerCase()}/callback`
      )
    );
    
    res.redirect(url);
  }
  
  @Post(':provider/callback')
  @ApiOperation({ summary : '소셜 로그인 콜백 처리 (POST 방식)' })
  @ApiResponse({ status : 200 , type : () => LoginResponse ,description : '소셜로그인 성공'})
  async socialCallback(
    @Param() providerDto: SocialProviderDto,
    @Body() body: SocialCallbackDto,
    @Res() res: Response,
  ): Promise<void> {
      
      // 소셜 로그인 커맨드 실행
      const result = await this.commandBus.execute(
        new SocialLoginCommand(
          providerDto.provider,
          body.code,
          body.state
        )
      );

      // 인증 토큰 가져오기
      const token = result.getAuthToken();
      
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
      
      res.json(LoginResponse.from(result));
  }

  @Get("/principal/:providerType/:providerId")
  @ApiOperation({ summary : '유저 정보 획득' , description : '해당 API 는 각 서비스에서 유저정보를 획득하기 위해 사용합니다. 클라이언트에서 사용하지 않습니다.' })
  @ApiResponse({ status : 200 , type : () => GetUserPrincipalResponse ,description : '유저 정보 획득 성공'})
  async getUserPrincipal(@Param() param: GetUserPrincipalRequest) : Promise<GetUserPrincipalResponse> {
    const userPrincipal = await this.queryBus.execute(new GetUserPrincipalQuery(param.providerType.value, param.providerId));
    return GetUserPrincipalResponse.from(userPrincipal);
  }

  
  @Get(':provider/callback')
  @ApiOperation({ summary : '소셜 로그인 콜백 처리 (GET 방식)' })
  @ApiResponse({ status : 200 , type : () => LoginResponse ,description : '소셜로그인 성공'})
  async socialCallbackGet(
    @Param() providerDto: SocialProviderDto,
    @Query() callbackDto: SocialCallbackDto,
    @Res() res: Response,
  ): Promise<void> {
      
      // 소셜 로그인 커맨드 실행
      const result = await this.commandBus.execute(
        new SocialLoginCommand(
          providerDto.provider,
          callbackDto.code,
          callbackDto.state
        )
      );

      // 인증 토큰 가져오기
      const token = result.getAuthToken();
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
      
      res.json(LoginResponse.from(result));
  }

  @Post(':provider/native')
  @ApiOperation({ summary : '소셜 로그인 (네이티브 방식)'})
  @ApiResponse({ status : 200 , type : () => LoginResponse ,description : '소셜로그인 성공'})
  async socialLoginNative(
    @Param() param: SocialLogInNativeParam,
    @Body() body : SocialLoginNativeBody,
    @Res() res: Response,
  ): Promise<void> {
      // 소셜 로그인 커맨드 실행
      const result = await this.commandBus.execute(
        new SocialLoginByTokenCommand(
          param.provider,
          body.toAuthToken()
        )
      );

      // 인증 토큰 가져오기
      const token = result.getAuthToken();
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
      
      res.json(LoginResponse.from(result));
  }

  @Post('/auth/phone')
  @UseGuards(AccessGuard,UserGuard)
  @ApiOperation({ summary : '휴대폰 인증번호 요청' })
  @ApiResponse({ status : 201, type : () => SendOptMessageResponse })
  async sendOptMessage(
    @Body() body : SendOptMessageBody,
    @UserParam() user : UserPrincipal,
  ) : Promise<SendOptMessageResponse> {
    const opt = await this.commandBus.execute(new SendOptMessageCommand(user,body.phoneNumber))
    return new SendOptMessageResponse(opt)
  }

  @Post('/auth/phone/verify')
  async verfyOptMessage(
    @Body() body : VerifyOptMessageBody,
    @UserParam() user : UserPrincipal,
  ) : Promise<VerifyOptMessageResponse> {
    const verifyResult = await this.commandBus.execute(new VerifyOtpMessageCommand(user,body.phoneNumber,body.opt))
    return new VerifyOptMessageResponse(verifyResult.success,verifyResult.remainingAttempts)
  }
}
