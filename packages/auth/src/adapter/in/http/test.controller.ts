import { Body, Controller, Get, Param, Post, Query, Req, Res } from "@nestjs/common";
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { SocialSigninUseCase } from '@app/application/usecase/social-signin.usecase';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Tenant } from '@app/common/decorator/tenant.decorator';
import { ENV_KEY } from '@app/common/config/env.config';

@ApiTags('Test')
@Controller('test')
export class TestController {
  constructor(
    private readonly socialSignin: SocialSigninUseCase,
    private readonly configService: ConfigService,
  ) {}

  @Get(':provider')
  @ApiOperation({ summary: '소셜 로그인 페이지 요청' })
  @ApiResponse({ status: 302, description: '소셜로그인 페이지 리다이렉트' })
  async getSocialLoginPage(
    @Param('provider') provider: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    // 카카오 로그인 URL 생성
    const redirectUri = `${req.protocol}://${req.get('host')}/test/${provider}/callback`;
    let authUrl = '';

    if (provider === 'kakao') {
      // 카카오 로그인 URL 생성
      const clientId = this.configService.get<string>(ENV_KEY.KAKAO_CLIENT_ID);
      if (!clientId) {
        throw new Error('KAKAO_CLIENT_ID not configured');
      }
      authUrl = `https://kauth.kakao.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code`;
    } else {
      throw new Error(`Unsupported provider: ${provider}`);
    }

    res.redirect(authUrl);
  }

  @Get(':provider/callback')
  @ApiOperation({ summary: '소셜 로그인 콜백 처리 (GET 방식)' })
  @ApiResponse({ status: 200, description: '소셜로그인 성공' })
  async socialCallbackGet(
    @Param('provider') provider: string,
    @Query('code') code: string,
    @Query('state') state: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    let result;

    if (provider === 'kakao') {
      const redirectUri = `${req.protocol}://${req.get('host')}/test/${provider}/callback`;
      result = await this.socialSignin.signinWithKakao({
        tenantId: '1',
        authCode: code,
        redirectUri,
      });
    } else {
      throw new Error(`Unsupported provider: ${provider}`);
    }

    // 인증 토큰 가져오기
    const token = result;
    
    res.cookie('accessToken', token.accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: token.expiresIn * 1000,
    });
    res.cookie('refreshToken', token.refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30일
    });
    
    res.json(result);
  }

  @Post(':provider/callback')
  @ApiOperation({ summary: '소셜 로그인 콜백 처리 (POST 방식)' })
  @ApiResponse({ status: 200, description: '소셜로그인 성공' })
  async socialCallback(
    @Param('provider') provider: string,
    @Body() body: { code: string; state?: string },
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    let result;

    if (provider === 'kakao') {
      const redirectUri = `${req.protocol}://${req.get('host')}/test/${provider}/callback`;
      result = await this.socialSignin.signinWithKakao({
        tenantId: '1',
        authCode: body.code,
        redirectUri,
      });
    } else {
      throw new Error(`Unsupported provider: ${provider}`);
    }

    // 인증 토큰을 쿠키에 설정
    res.cookie('accessToken', result.accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: result.expiresIn * 1000,
    });
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30일
    });

    res.json(result);
  }
}
