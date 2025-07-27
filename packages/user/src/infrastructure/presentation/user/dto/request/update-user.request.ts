import { UserGender, UserRegion } from "@app/domain/model/user";
import {
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsEnum,
} from "class-validator";

export class UpdateUserBody {
  /**
   * 닉네임
   */
  @IsString({ message: "닉네임은 문자열이어야 합니다." })
  @MinLength(2, { message: "닉네임은 최소 2자 이상이어야 합니다." })
  @MaxLength(50, { message: "닉네임은 최대 50자까지 가능합니다." })
  @IsOptional()
  nickname?: string;

  /**
   * 프로필 이미지 URL
   */
  @IsString({ message: "프로필 이미지 URL은 문자열이어야 합니다." })
  @IsOptional()
  profileImageUrl?: string;

  @IsEnum(UserGender, { message: "유효한 성별이 아닙니다." })
  @IsOptional()
  gender?: UserGender;
  /**
   * 지역
   */
  @IsEnum(UserRegion, { message: "유효한 지역이 아닙니다." })
  @IsOptional()
  region?: UserRegion;

  /**
   * 자기소개
   */
  @IsString({ message: "자기소개는 문자열이어야 합니다." })
  @IsOptional()
  bio?: string;
}
