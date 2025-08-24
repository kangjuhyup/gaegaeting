import { AuthToken } from "@app/auth/domain/model/auth-token";
import { ApiProperty } from "@nestjs/swagger";
import { IsJWT, IsNotEmpty, IsNumber, IsString } from "class-validator";

export class SocialLoginNativeBody {
 @ApiProperty({ description : '소셜에서 발급받은 액세스토큰', required : true })
 @IsNotEmpty()
 @IsJWT()
 private readonly accessToken: string;

 @ApiProperty({ description : '소셜에서 발급받은 리프레시토큰', required : true })
 @IsNotEmpty()
 @IsJWT()
 private readonly refreshToken: string;
 
 @ApiProperty({ description : '액세스 토큰 만료 시간 (초)', required : true })
 @IsNotEmpty()
 @IsNumber()
 private readonly expiresIn: number;
 
 @ApiProperty({ description : '리프레시 토큰 만료 시간 (초)', required : true })
 @IsNotEmpty()
 @IsNumber()
 private readonly refreshTokenExpiresIn: number;

 @ApiProperty({ description : '액세스 토큰 타입', required : true })
 @IsNotEmpty()
 @IsString()
 private readonly tokenType: string;

 toAuthToken() {
    return AuthToken.of({
        accessToken : this.accessToken,
        refreshToken : this.refreshToken,
        expiresIn : this.expiresIn,
        refreshTokenExpiresIn : this.refreshTokenExpiresIn,
        tokenType : this.tokenType
    })
 }
}