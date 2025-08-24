import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SocialCallbackDto {

  @ApiProperty({ description : '인증 코드', required : true })
  @IsNotEmpty({ message: '인증 코드는 필수입니다.' })
  @IsString({ message: '인증 코드는 문자열이어야 합니다.' })
  code: string;

  @ApiProperty({ description : '상태 값(선택)', required : false })
  @IsOptional()
  @IsString({ message: '상태 값은 문자열이어야 합니다.' })
  state?: string;
}
