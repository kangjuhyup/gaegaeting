import {
  UserGender,
  UserRegion,
  AuthProvider,
  UserEntity,
  UserStatus,
} from "@app/domain/model/user";
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
  IsEnum,
  IsDate,
  IsOptional,
} from "class-validator";

export class CreateUserBody {
  /**
   * 이메일
   */
  @IsEmail({}, { message: "유효한 이메일 형식이 아닙니다." })
  @IsNotEmpty({ message: "이메일은 필수 입력 항목입니다." })
  email: string;

  /**
   * 비밀번호
   */
  @IsString({ message: "비밀번호는 문자열이어야 합니다." })
  @MinLength(8, { message: "비밀번호는 최소 8자 이상이어야 합니다." })
  @IsNotEmpty({ message: "비밀번호는 필수 입력 항목입니다." })
  password: string;

  /**
   * 닉네임
   */
  @IsString({ message: "닉네임은 문자열이어야 합니다." })
  @MinLength(2, { message: "닉네임은 최소 2자 이상이어야 합니다." })
  @MaxLength(50, { message: "닉네임은 최대 50자까지 가능합니다." })
  @IsNotEmpty({ message: "닉네임은 필수 입력 항목입니다." })
  nickname: string;

  /**
   * 성별
   */
  @IsEnum(UserGender, { message: "유효한 성별이 아닙니다." })
  @IsNotEmpty({ message: "성별은 필수 입력 항목입니다." })
  gender: UserGender;

  /**
   * 생년월일
   */
  @IsDate({ message: "유효한 날짜 형식이 아닙니다." })
  @IsNotEmpty({ message: "생년월일은 필수 입력 항목입니다." })
  birthDate: Date;

  /**
   * 지역
   */
  @IsEnum(UserRegion, { message: "유효한 지역이 아닙니다." })
  @IsNotEmpty({ message: "지역은 필수 입력 항목입니다." })
  region: UserRegion;

  /**
   * 자기소개
   */
  @IsString({ message: "자기소개는 문자열이어야 합니다." })
  @IsOptional()
  bio?: string;

  /**
   * 전화번호
   */
  @IsString({ message: "전화번호는 문자열이어야 합니다." })
  @IsOptional()
  phoneNumber?: string;

  /**
   * 인증 방식
   */
  @IsEnum(AuthProvider, { message: "유효한 인증 방식이 아닙니다." })
  @IsOptional()
  authProvider?: AuthProvider = AuthProvider.EMAIL;

  /**
   * 소셜 로그인 제공자 ID
   */
  @IsString({ message: "소셜 로그인 ID는 문자열이어야 합니다." })
  @IsOptional()
  authProviderId?: string;

  toDomain(): UserEntity {
    return new UserEntity({
      email: this.email,
      password: this.password,
      nickname: this.nickname,
      gender: this.gender,
      birthDate: this.birthDate,
      region: this.region,
      bio: this.bio,
      phoneNumber: this.phoneNumber,
      authProvider: this.authProvider,
      authProviderId: this.authProviderId,
      status: UserStatus.ACTIVE, // 기본 상태는 ACTIVE
    });
  }
}
