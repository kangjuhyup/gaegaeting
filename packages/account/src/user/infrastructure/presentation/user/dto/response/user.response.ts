import { UserEntity } from "@app/user/domain/model/user";

export class UserResponse {
  private readonly id: string;
  private readonly nickname: string;
  private readonly gender: string;
  private readonly region: string;
  private readonly bio: string;
  private readonly phoneNumber: string;

  constructor(
    id: string,
    nickname: string,
    gender: string,
    region: string,
    bio: string,
    phoneNumber: string,
  ) {
    this.id = id;
    this.nickname = nickname;
    this.gender = gender;
    this.region = region;
    this.bio = bio;
    this.phoneNumber = phoneNumber;
  }

  static fromDomain(user: UserEntity): UserResponse {
    return new UserResponse(
      user.id,
      user.nickname,
      user.gender,
      user.region,
      user.bio,
      user.phoneNumber,
    );
  }
}
