import { AuthProvider } from "@core/auth";
import { EnumTransformPipe } from "@core/util";
import { IsBoolean, IsNotEmpty, IsOptional, IsString, IsUUID } from "class-validator";

export class CreateTokenRequestBody {
  @IsNotEmpty()
  @IsUUID()
  userId: string;

  @IsNotEmpty()
  @EnumTransformPipe(AuthProvider, '지원하지 않는 소셜 로그인 제공자입니다.')
  socialProvider: AuthProvider;
  
  @IsNotEmpty()
  @IsString()
  socialId: string;

  @IsOptional()
  @IsBoolean()
  profileRegistered?: boolean;
  
  @IsOptional()
  @IsBoolean()
  phoneVerified?: boolean;
  
  @IsOptional()
  @IsBoolean()
  petRegistered?: boolean;
}