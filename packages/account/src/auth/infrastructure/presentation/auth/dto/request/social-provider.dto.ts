import { AuthProvider } from '@core/auth';
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';
import { EnumTransformPipe } from '@app/common/pipes/enum-transform.pipe';

export class SocialProviderDto {
  @ApiProperty({ 
    description: '소셜 로그인 제공자', 
    enum: () => Object.entries(AuthProvider).map(([key, value]) => key) 
  })
  @IsNotEmpty({ message: '소셜 로그인 제공자는 필수입니다.' })
  @EnumTransformPipe(AuthProvider, '지원하지 않는 소셜 로그인 제공자입니다.')
  provider: AuthProvider;
}
