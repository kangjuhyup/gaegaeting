import { UserEntity } from "@app/user/domain/model/user";
import { ApiProperty } from "@nestjs/swagger";

export class UserResponse {
  @ApiProperty({ description: '사용자 ID' })
  private readonly id: string;
  
  @ApiProperty({ description: '닉네임' })
  private readonly nickname: string;
  
  @ApiProperty({ description: '성별' })
  private readonly gender: string;
  
  @ApiProperty({ description: '지역' })
  private readonly region: string;
  
  @ApiProperty({ description: '자기소개' })
  private readonly bio: string;
  
  @ApiProperty({ description: '전화번호' })
  private readonly phoneNumber: string;

  @ApiProperty({ description : '프로필이미지' })
  private readonly profileImages : string[]

  constructor(
    id: string,
    nickname: string,
    gender: string,
    region: string,
    bio: string,
    phoneNumber: string,
    profileImages? : string[],
  ) {
    this.id = id;
    this.nickname = nickname;
    this.gender = gender;
    this.region = region;
    this.bio = bio;
    this.phoneNumber = phoneNumber;
    this.profileImages = profileImages;
  }

  static fromDomain(user: UserEntity): UserResponse {
    return new UserResponse(
      user.id,
      user.nickname,
      user.gender.label,
      user.region.label,
      user.bio,
      user.phoneNumber,
      user.profiles?.map((p) => p.path)
    );
  }
}
