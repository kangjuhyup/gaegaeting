import { AuthProvider } from "@core/auth";
import { Transform } from "class-transformer"
import { IsNotEmpty, IsEnum, IsNumber, Min, MinLength } from 'class-validator';

export class GetUserPrincipalRequest {

    @IsNotEmpty({ message: '소셜 로그인 제공자는 필수입니다.' })
    @Transform(({ value }) => {
       if (typeof value !== 'string') return value;
       
       const lowerValue = value.toLowerCase();
       switch (lowerValue) {
         case 'kakao':
           return AuthProvider.KAKAO;
         case 'naver':
           return AuthProvider.NAVER;
         case 'google':
           return AuthProvider.GOOGLE;
         default:
           return value; // 유효성 검사에서 처리
       }
    })
    @IsEnum(AuthProvider, { message: '지원하지 않는 소셜 로그인 제공자입니다. (kakao, naver, google만 지원)' })
    readonly providerType : AuthProvider;
    
    @IsNotEmpty()
    @MinLength(1)
    readonly providerId : string;
}