import { EnumTransformPipe } from "@app/common/pipes/enum-transform.pipe";
import { PetPersonality } from "@app/pet/domain/enum/pet.enum";
import { ApiProperty } from "@nestjs/swagger";
import { IsString, MaxLength, IsOptional, IsNumber, Min, Max, IsArray, IsEnum } from "class-validator";

/**
 * 강아지 업데이트 DTO
 * 
 * 강아지 정보 업데이트 요청에 필요한 데이터를 정의합니다.
 */
export class UpdatePetBody {
  
  @ApiProperty({ description : '반려동물 이름' })
  @IsString({ message: '이름은 문자열이어야 합니다.' })
  @MaxLength(50, { message: '이름은 최대 50자까지 가능합니다.' })
  @IsOptional()
  name?: string;

  @ApiProperty({ description : '반려동물 나이' })
  @IsNumber({}, { message: '나이는 숫자여야 합니다.' })
  @Min(0, { message: '나이는 0보다 크거나 같아야 합니다.' })
  @Max(30, { message: '나이는 30보다 작거나 같아야 합니다.' })
  @IsOptional()
  age?: number;

  @ApiProperty({ description : '반려동물 성격 특성' })
  @IsArray({ message: '성격 특성은 배열이어야 합니다.' })
  @EnumTransformPipe(PetPersonality,'유효한 성격 특성이 아닙니다.')
  @IsOptional()
  personalities?: PetPersonality[];

  @ApiProperty({ description : '반려동물 설명' })
  @IsString({ message: '설명은 문자열이어야 합니다.' })
  @IsOptional()
  description?: string;
}
