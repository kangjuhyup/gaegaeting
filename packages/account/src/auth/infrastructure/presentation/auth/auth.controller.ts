import { Body, Controller, Get, Param, Post, Query, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { SocialRedirectQuery } from '@app/auth/application/port/in/query/social-redirect.port';
import { SocialLoginCommand } from '@app/auth/application/port/in/command/social-login.port';
import { SocialCallbackDto } from './dto/request/social-callback.dto';
import { ConfigService } from '@nestjs/config';
import { ENV_KEY } from '../../../config/env.config';
import { LoginResponse } from './dto/response/login.response';
import { SocialProviderDto } from './dto/request/social-provider.dto';
import { GetUserPrincipalRequest } from './dto/request/get-user-principal.request';
import { GetUserPrincipalResponse } from './dto/response/get-user-principal.response';
import { GetUserPrincipalQuery } from '@app/auth/application/port/in/query/get-user-princial.port';
import { AuthProvider } from '@core/auth';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Account','Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly queryBus : QueryBus,
    private readonly commandBus : CommandBus,
    private readonly configService: ConfigService,
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

  /**
   * 테스트용 소셜 로그인 페이지
   * 
   * 소셜 로그인 버튼이 있는 HTML 페이지를 제공합니다.
   * 
   * @param providerDto 소셜 로그인 제공자 DTO
   * @param req 요청 객체
   * @param res 응답 객체
   */
  @Get('test/:provider')
  testSocialLogin(
    @Param() providerDto: SocialProviderDto,
    @Req() req: Request, 
    @Res() res: Response
  ): void {
    
    // 제공자별 클라이언트 ID 가져오기
    let clientId = '';
    let apiKey = '';
    let providerName = '';
    let logoUrl = '';
    
    switch (providerDto.provider) {
      case AuthProvider.KAKAO:
        clientId = this.configService.get<string>(ENV_KEY.KAKAO_CLIENT_ID);
        apiKey = this.configService.get<string>(ENV_KEY.KAKAO_API_KEY, '설정되지 않음');
        providerName = '카카오';
        logoUrl = 'https://developers.kakao.com/assets/img/about/logos/kakaotalksharing/kakaotalk_sharing_btn_medium.png';
        break;
      case AuthProvider.NAVER:
        clientId = this.configService.get<string>(ENV_KEY.NAVER_CLIENT_ID);
        providerName = '네이버';
        logoUrl = 'https://static.nid.naver.com/oauth/button_g.PNG';
        break;
      case AuthProvider.GOOGLE:
        clientId = this.configService.get<string>(ENV_KEY.GOOGLE_CLIENT_ID);
        providerName = '구글';
        logoUrl = 'https://developers.google.com/identity/images/btn_google_signin_light_normal_web.png';
        break;
    }
    
    const redirectUri = `${req.protocol}://${req.get('host')}/auth/${providerDto.provider.label.toLowerCase()}/callback`;
    
    // HTML 페이지 생성
    const html = `
      <!DOCTYPE html>
      <html lang="ko">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${providerName} 로그인 테스트</title>
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
          <h1>${providerName} 로그인 테스트</h1>
          
          <a href="/auth/${providerDto.provider.label.toLowerCase()}" class="kakao-btn">
            <img src="${logoUrl}" alt="${providerName} 로고">
            ${providerName} 로그인
          </a>
          
          <div class="description">
            <p>이 페이지는 ${providerName} 로그인 기능을 테스트하기 위한 페이지입니다.</p>
            <p>위 버튼을 클릭하면 ${providerName} 로그인 페이지로 이동합니다.</p>
          </div>
          
          <div class="code-block">
            <p><strong>리다이렉트 URI:</strong> ${redirectUri}</p>
            <p><strong>클라이언트 ID:</strong> ${clientId}</p>
          </div>
          
          <p class="api-key">API 키: ${apiKey || '설정되지 않음'}</p>
        </div>
        
        <script>
          // 콜백 처리를 위한 코드
          function handleCallback() {
            const urlParams = new URLSearchParams(window.location.search);
            const code = urlParams.get('code');
            const state = urlParams.get('state');
            
            if (code) {
              
              // 서버로 코드 전송
              fetch('/auth/${providerDto.provider.label.toLowerCase()}/callback', {
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
  
}
