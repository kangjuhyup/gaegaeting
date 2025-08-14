import { Body, Controller, Get, Post, Query, Redirect, Req, Res } from '@nestjs/common';
import { Response } from 'express';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { SocialRedirectQuery } from '@app/auth/application/port/in/query/social-redirect.port';
import { SocialLoginCommand } from '@app/auth/application/port/in/command/social-login.port';
import { SocialLoginBody } from './dto/request/social-login.request';
import { ConfigService } from '@nestjs/config';
import { ENV_KEY } from '../../../config/env.config';
import { AuthProvider } from '@core/database';
import { LoginResponse } from './dto/response/login.response';

/**
 * 인증 컨트롤러
 * 
 * 소셜 로그인 관련 HTTP 요청을 처리하는 컨트롤러입니다.
 */
@Controller('auth')
export class AuthController {
  constructor(
    private readonly queryBus : QueryBus,
    private readonly commandBus : CommandBus,
    private readonly configService: ConfigService,
  ) {}
  
  /**
   * 카카오 로그인 요청 처리
   */
  @Get('kakao')
  async getKakaoLoginPage(@Req() req, @Res() res: Response): Promise<void> {
    const url = await this.queryBus.execute(
      new SocialRedirectQuery(
        AuthProvider.KAKAO, 
        `${req.protocol}://${req.get('host')}/auth/kakao/callback`
      )
    );
    
    res.redirect(url);
  }

  @Get('naver')
  async getNaverLoginPage(@Req() req, @Res() res: Response): Promise<void> {
    const url = await this.queryBus.execute(
      new SocialRedirectQuery(
        AuthProvider.NAVER, 
        `${req.protocol}://${req.get('host')}/auth/naver/callback`
      )
    );
    
    res.redirect(url);
  }

  @Get('google')
  async getGoogleLoginPage(@Req() req, @Res() res: Response): Promise<void> {
    const url = await this.queryBus.execute(
      new SocialRedirectQuery(
        AuthProvider.GOOGLE, 
        `${req.protocol}://${req.get('host')}/auth/google/callback`
      )
    );
    
    res.redirect(url);
  }

  
  /**
   * 카카오 로그인 콜백 처리
   */
  @Post('kakao/callback')
  async kakaoCallback(
    @Body() body: SocialLoginBody,
    @Res() res: Response,
  ): Promise<void> {
      // 소셜 로그인 커맨드 실행
      const result = await this.commandBus.execute(
        new SocialLoginCommand(
          AuthProvider.KAKAO,
          body.code,
          body.state
        )
      );

      // 인증 토큰 가져오기
      const token = result.getAuthToken();
      
      // 프론트엔드로 토큰 전달 (쿠키)
      res.cookie('accessToken', token.getAccessToken(), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: token.getExpiresIn() * 1000, // 초 단위를 밀리초로 변환
        path: '/',
        sameSite: 'lax'
      });
      
      res.cookie('refreshToken', token.getRefreshToken(), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30일
        path: '/',
        sameSite: 'lax'
      });
    res.json(LoginResponse.from(result));
  }
  
  /**
   * 네이버 로그인 콜백 처리
   */
  @Post('naver/callback')
  async naverCallback(
    @Body() body: SocialLoginBody,
    @Res() res: Response,
  ): Promise<void> {
      // 소셜 로그인 커맨드 실행
      const result = await this.commandBus.execute(
        new SocialLoginCommand(
          AuthProvider.NAVER,
          body.code,
          body.state
        )
      );

      // 인증 토큰 가져오기
      const token = result.getAuthToken();
      
      // 프론트엔드로 토큰 전달 (쿠키)
      res.cookie('accessToken', token.getAccessToken(), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: token.getExpiresIn() * 1000, // 초 단위를 밀리초로 변환
        path: '/',
        sameSite: 'lax'
      });
      
      res.cookie('refreshToken', token.getRefreshToken(), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30일
        path: '/',
        sameSite: 'lax'
      });
      
      res.json(LoginResponse.from(result));
  }
  
  /**
   * 구글 로그인 콜백 처리
   */
  @Post('google/callback')
  async googleCallback(
    @Body() body: SocialLoginBody,
    @Res() res: Response,
  ): Promise<void> {
      // 소셜 로그인 커맨드 실행
      const result = await this.commandBus.execute(
        new SocialLoginCommand(
          AuthProvider.GOOGLE,
          body.code,
          body.state
        )
      );

      // 인증 토큰 가져오기
      const token = result.getAuthToken();
      
      // 프론트엔드로 토큰 전달 (쿠키)
      res.cookie('accessToken', token.getAccessToken(), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: token.getExpiresIn() * 1000, // 초 단위를 밀리초로 변환
        path: '/',
        sameSite: 'lax'
      });
      
      res.cookie('refreshToken', token.getRefreshToken(), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30일
        path: '/',
        sameSite: 'lax'
      });
      
      res.json(LoginResponse.from(result));
  }
  /**
   * 테스트용 카카오 로그인 페이지
   * 
   * 카카오 로그인 버튼이 있는 HTML 페이지를 제공합니다.
   */
  @Get('test-kakao')
  testKakaoLogin(@Req() req, @Res() res: Response): void {
    const clientId = this.configService.get<string>(ENV_KEY.KAKAO_CLIENT_ID);
    const redirectUri = `${req.protocol}://${req.get('host')}/auth/kakao/callback`;
    
    // HTML 페이지 생성
    const html = `
      <!DOCTYPE html>
      <html lang="ko">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>카카오 로그인 테스트</title>
        <style>
          body {
            font-family: 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            background-color: #f5f5f5;
          }
          .container {
            background-color: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            padding: 30px;
            text-align: center;
            max-width: 500px;
            width: 100%;
          }
          h1 {
            color: #333;
            margin-bottom: 30px;
          }
          .kakao-btn {
            background-color: #FEE500;
            border: none;
            border-radius: 4px;
            color: #000000;
            cursor: pointer;
            font-size: 16px;
            font-weight: bold;
            padding: 12px 24px;
            margin: 10px 0;
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            text-decoration: none;
          }
          .kakao-btn img {
            margin-right: 10px;
            width: 20px;
            height: 20px;
          }
          .description {
            margin-top: 20px;
            color: #666;
            font-size: 14px;
            line-height: 1.5;
          }
          .code-block {
            background-color: #f8f8f8;
            border-radius: 4px;
            padding: 15px;
            margin-top: 20px;
            text-align: left;
            overflow: auto;
            font-family: monospace;
          }
          .api-key {
            font-size: 12px;
            color: #888;
            margin-top: 10px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>카카오 로그인 테스트</h1>
          
          <a href="/auth/kakao" class="kakao-btn">
            <img src="https://developers.kakao.com/assets/img/about/logos/kakaotalksharing/kakaotalk_sharing_btn_medium.png" alt="카카오 로고">
            카카오 로그인
          </a>
          
          <div class="description">
            <p>이 페이지는 카카오 로그인 기능을 테스트하기 위한 페이지입니다.</p>
            <p>위 버튼을 클릭하면 카카오 로그인 페이지로 이동합니다.</p>
          </div>
          
          <div class="code-block">
            <p><strong>리다이렉트 URI:</strong> ${redirectUri}</p>
            <p><strong>클라이언트 ID:</strong> ${clientId}</p>
          </div>
          
          <p class="api-key">API 키: ${this.configService.get<string>(ENV_KEY.KAKAO_API_KEY, '설정되지 않음')}</p>
        </div>
        
        <script>
          // 콜백 처리를 위한 코드
          function handleCallback() {
            const urlParams = new URLSearchParams(window.location.search);
            const code = urlParams.get('code');
            const state = urlParams.get('state');
            
            if (code) {
              console.log('인증 코드:', code);
              console.log('상태:', state);
              
              // 서버로 코드 전송
              fetch('/auth/kakao/callback', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ code, state })
              })
              .then(response => {
                if (response.redirected) {
                  window.location.href = response.url;
                }
              })
              .catch(error => {
                console.error('에러:', error);
              });
            }
          }
          
          // 페이지 로드 시 콜백 처리
          window.onload = handleCallback;
        </script>
      </body>
      </html>
    `;
    
    // HTML 응답 전송
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  }
  
  /**
   * 카카오 로그인 콜백 처리 (GET 방식)
   */
  @Get('kakao/callback')
  async kakaoCallbackGet(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ): Promise<void> {
      // 소셜 로그인 커맨드 실행
      const result = await this.commandBus.execute(
        new SocialLoginCommand(
          AuthProvider.KAKAO,
          code,
          state
        )
      );

      // 인증 토큰 가져오기
      const token = result.getAuthToken();
      
      // 프론트엔드로 토큰 전달 (쿠키)
      res.cookie('accessToken', token.getAccessToken(), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: token.getExpiresIn() * 1000, // 초 단위를 밀리초로 변환
        path: '/',
        sameSite: 'lax'
      });
      
      res.cookie('refreshToken', token.getRefreshToken(), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30일
        path: '/',
        sameSite: 'lax'
      });
      
      res.json(LoginResponse.from(result));
  }
}
