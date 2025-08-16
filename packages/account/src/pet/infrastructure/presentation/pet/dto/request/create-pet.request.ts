import { EnumTransformPipe } from "@app/common/pipes/enum-transform.pipe";
import { PetGender, PetBreed, PetSize, PetPersonality } from "@app/pet/domain/enum/pet.enum";
import { PetEntity } from "@app/pet/domain/model/pet";
import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNotEmpty, MaxLength, IsNumber, Min, Max, IsEnum, IsArray, IsOptional } from "class-validator";

export class CreatePetBody {
  @ApiProperty({ description : '반려동물 이름', required : true})
      @IsString({ message: '이름은 문자열이어야 합니다.' })
      @IsNotEmpty({ message: '이름은 필수 입력 항목입니다.' })
      @MaxLength(50, { message: '이름은 최대 50자까지 가능합니다.' })
      name: string;
    
      @ApiProperty({ description : '반려동물 나이', required : true})
      @IsNumber({}, { message : '나이는 숫자여야 합니다.'})
      @Min(0, { message: '나이는 0보다 크거나 같아야 합니다.' })
      @Max(30, { message: '나이는 30보다 작거나 같아야 합니다.' })
      @IsNotEmpty({ message: '나이는 필수 입력 항목입니다.' })
      age: number;
    
      @ApiProperty({ description : '반려동물 성별', enum : () => Object.entries(PetGender).map(([key, value]) => key) ,required : true})
      @EnumTransformPipe(PetGender,'지원하지 않는 성별입니다.')
      @IsNotEmpty({ message: '성별은 필수 입력 항목입니다.' })
      gender: PetGender;
    
      @ApiProperty({ description : '반려동물 품종', enum : () => Object.entries(PetBreed).map(([key, value]) => key) ,required : true})
      @EnumTransformPipe(PetBreed,'지원하지 않는 품종입니다.')
      @IsNotEmpty({ message: '품종은 필수 입력 항목입니다.' })
      breed: PetBreed;
    
      @ApiProperty({ description : '반려동물 크기', enum : () => Object.entries(PetSize).map(([key, value]) => key) ,required : true})
      @EnumTransformPipe(PetSize,'지원하지 않는 크기입니다.')
      @IsNotEmpty({ message: '크기는 필수 입력 항목입니다.' })
      size: PetSize;
    
      @ApiProperty({ description : '반려동물 성격 특성', enum : () => Object.entries(PetPersonality).map(([key, value]) => key) ,required : true})
      @EnumTransformPipe(PetPersonality,'지원하지 않는 성격 특성이 있습니다.')
  @IsArray({ message: '성격 특성은 배열이어야 합니다.', each : true })
  @IsNotEmpty({ message: '성격 특성은 필수 입력 항목입니다.' })
  personalities: PetPersonality[];
    
  @ApiProperty({ description : '반려동물 설명', required : false})
  @IsString({ message: '설명은 문자열이어야 합니다.' })
  @IsOptional()
  description?: string;

  toDomain(userId : string) : PetEntity {
    return PetEntity.of({
      name : this.name,
      age : this.age,
      gender : this.gender,
      breed : this.breed,
      size : this.size,
      personalities : this.personalities,
      description : this.description,
      userId : userId
    })
  }
}