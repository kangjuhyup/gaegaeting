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

  private getExternalBaseUrl(req: Request): string {
    const host =
      req.get('x-forwarded-host') ?? req.get('host') ?? req.headers.host;

    // 운영 환경에서는 TLS termination(ingress) 뒤에 있어도 https로 고정
    if (process.env.NODE_ENV === 'production') {
      return `https://${host}`;
    }

    // 로컬/개발 환경은 실제 프로토콜을 최대한 사용
    const forwardedProto = req.get('x-forwarded-proto')?.split(',')[0]?.trim();
    const proto = forwardedProto || req.protocol;
    return `${proto}://${host}`;
  }

  @Get(':provider')
  @ApiOperation({ summary: '소셜 로그인 페이지 요청(테스트용)' })
  @ApiResponse({ status: 302, description: '소셜로그인 페이지 리다이렉트' })
  async getSocialLoginPage(
    @Param('provider') provider: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    // 카카오 로그인 URL 생성
    const redirectUri = `${this.getExternalBaseUrl(req)}/auth/test/${provider}/callback`;
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
      const redirectUri = `${this.getExternalBaseUrl(req)}/test/${provider}/callback`;
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
      const redirectUri = `${this.getExternalBaseUrl(req)}/test/${provider}/callback`;
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
