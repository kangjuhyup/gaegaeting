import { IsNotEmpty, IsString } from "class-validator";

/**
 * 강아지 이미지 DTO
 * 
 * 강아지 이미지 추가 요청에 필요한 데이터를 정의합니다.
 */
export class PetImageRequest {
      /**
   * 이미지 URL
   */
  @IsString({ message: '이미지 URL은 문자열이어야 합니다.' })
  @IsNotEmpty({ message: '이미지 URL은 필수 입력 항목입니다.' })
  imageUrl: string;
}