
import { UserGender, UserRegion, UserStatus } from "@app/user/domain/enum/user.enum";
import { UserEntity } from "@app/user/domain/model/user";
import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { EnumTransformPipe } from "@app/common/pipes/enum-transform.pipe";
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsPhoneNumber,
  IsDate,
} from "class-validator";

export class CreateUserBody {

  @ApiProperty({ description: '이름', required : true})
  @IsString()
  @IsNotEmpty()
  name : string;

  @ApiProperty({ description : '이메일 주소', required : false})
  @IsEmail({}, { message: "유효한 이메일 형식이 아닙니다." })
  @IsOptional()
  email?: string;

  @ApiProperty({ description : '비밀번호', required : false})
  @IsString({ message: "비밀번호는 문자열이어야 합니다." })
  @MinLength(8, { message: "비밀번호는 최소 8자 이상이어야 합니다." })
  @IsOptional()
  password?: string;

  @ApiProperty({ description : '닉네임', required : true})
  @IsString({ message: "닉네임은 문자열이어야 합니다." })
  @MinLength(2, { message: "닉네임은 최소 2자 이상이어야 합니다." })
  @MaxLength(50, { message: "닉네임은 최대 50자까지 가능합니다." })
  @IsNotEmpty({ message: "닉네임은 필수 입력 항목입니다." })
  nickname: string;

  @ApiProperty({ description : '성별', enum : () => Object.entries(UserGender).map(([key, value]) => key) ,required : true})
  @EnumTransformPipe(UserGender, '유효한 성별이 아닙니다.')
  @IsNotEmpty({ message: "성별은 필수 입력 항목입니다." })
  gender: UserGender;

  @ApiProperty({ description : '생년월일 (YYYY-MM-DD 형식)', required : true, example: '2000-01-01'})
  @Transform(({value}) => {
    return new Date(value);
  })
  @IsDate({ message: "유효한 날짜 형식(YYYY-MM-DD)이 아닙니다." })
  @IsNotEmpty({ message: "생년월일은 필수 입력 항목입니다." })
  birthDate: Date;

  @ApiProperty({ description : '지역', enum : () => Object.entries(UserRegion).map(([key, value]) => key) ,required : true})
  @EnumTransformPipe(UserRegion, '유효한 지역이 아닙니다.')
  @IsNotEmpty({ message: "지역은 필수 입력 항목입니다." })
  region: UserRegion;

  @ApiProperty({ description : '자기소개', required : false})
  @IsString({ message: "자기소개는 문자열이어야 합니다." })
  @IsOptional()
  bio?: string;

  @ApiProperty({ description : '전화번호', required : false})
  @IsPhoneNumber('KR', { message: "전화번호는 문자열이어야 합니다." })
  @IsOptional()
  phoneNumber?: string;

  toDomain(): UserEntity {
    return UserEntity.of({
      passwordHash: this.password,
      name : this.name,
      nickname: this.nickname,
      gender: this.gender,
      birthDate: this.birthDate,
      region: this.region,
      bio: this.bio,
      phoneNumber: this.phoneNumber,
      status: UserStatus.ACTIVE, // 기본 상태는 ACTIVE
    });
  }
}
