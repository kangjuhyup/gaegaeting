import { PetGender, PetBreed, PetSize, PetPersonality } from "@app/user/domain/model/pet";
import { IsString, IsNotEmpty, MaxLength, IsNumber, Min, Max, IsEnum, IsArray, IsOptional } from "class-validator";

export class CreatePetBody {
     /**
       * 이름
       */
      @IsString({ message: '이름은 문자열이어야 합니다.' })
      @IsNotEmpty({ message: '이름은 필수 입력 항목입니다.' })
      @MaxLength(50, { message: '이름은 최대 50자까지 가능합니다.' })
      name: string;
    
      /**
       * 나이
       */
      @IsNumber({}, { message: '나이는 숫자여야 합니다.' })
      @Min(0, { message: '나이는 0보다 크거나 같아야 합니다.' })
      @Max(30, { message: '나이는 30보다 작거나 같아야 합니다.' })
      @IsNotEmpty({ message: '나이는 필수 입력 항목입니다.' })
      age: number;
    
      /**
       * 성별
       */
      @IsEnum(PetGender, { message: '유효한 성별이 아닙니다.' })
      @IsNotEmpty({ message: '성별은 필수 입력 항목입니다.' })
      gender: PetGender;
    
      /**
       * 품종
       */
      @IsEnum(PetBreed, { message: '유효한 품종이 아닙니다.' })
      @IsNotEmpty({ message: '품종은 필수 입력 항목입니다.' })
      breed: PetBreed;
    
      /**
       * 크기
       */
      @IsEnum(PetSize, { message: '유효한 크기가 아닙니다.' })
      @IsNotEmpty({ message: '크기는 필수 입력 항목입니다.' })
      size: PetSize;
    
      /**
       * 성격 특성
       */
      @IsArray({ message: '성격 특성은 배열이어야 합니다.' })
      @IsEnum(PetPersonality, { each: true, message: '유효한 성격 특성이 아닙니다.' })
      @IsNotEmpty({ message: '성격 특성은 필수 입력 항목입니다.' })
      personalities: PetPersonality[];
    
      /**
       * 이미지 URL
       */
      @IsString({ message: '이미지 URL은 문자열이어야 합니다.' })
      @IsOptional()
      imageUrl?: string;
    
      /**
       * 설명
       */
      @IsString({ message: '설명은 문자열이어야 합니다.' })
      @IsOptional()
      description?: string;
}