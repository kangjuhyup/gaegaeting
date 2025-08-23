import { EnumTransformPipe } from "@core/util";
import { UserGender, UserRegion } from "@app/user/domain/enum/user.enum";
import { ApiProperty } from "@nestjs/swagger";
import {
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsEnum,
} from "class-validator";

export class UpdateUserBody {
  
  @ApiProperty({ description : '닉네임', required : false })
  @IsString({ message: "닉네임은 문자열이어야 합니다." })
  @MinLength(2, { message: "닉네임은 최소 2자 이상이어야 합니다." })
  @MaxLength(50, { message: "닉네임은 최대 50자까지 가능합니다." })
  @IsOptional()
  nickname?: string;

  @ApiProperty({ description : '성별', enum : () => Object.entries(UserGender).map(([key, value]) => key) ,required : true})
  @EnumTransformPipe(UserGender, '유효한 성별이 아닙니다.')
  @IsOptional()
  gender?: UserGender;
  
  @ApiProperty({ description : '지역', enum : () => Object.entries(UserRegion).map(([key, value]) => key) ,required : true})
  @EnumTransformPipe(UserRegion, '유효한 지역이 아닙니다.')
  @IsOptional()
  region?: UserRegion;

  @ApiProperty({ description : '자기소개', required : false})
  @IsString({ message: "자기소개는 문자열이어야 합니다." })
  @IsOptional()
  bio?: string;
}
