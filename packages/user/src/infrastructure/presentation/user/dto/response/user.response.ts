import { UserEntity } from "@app/domain/model/user";

export class UserResponse {
  private readonly id: string;
  private readonly nickname: string;
  private readonly profileImageUrl: string;
  private readonly gender: string;
  private readonly region: string;
  private readonly bio: string;
  private readonly phoneNumber: string;
  private readonly authProvider: string;
  private readonly authProviderId: string;
  private readonly lastLoginAt: Date;

  constructor(
    id: string,
    nickname: string,
    profileImageUrl: string,
    gender: string,
    region: string,
    bio: string,
    phoneNumber: string,
    authProvider: string,
    authProviderId: string,
    lastLoginAt: Date,
  ) {
    this.id = id;
    this.nickname = nickname;
    this.profileImageUrl = profileImageUrl;
    this.gender = gender;
    this.region = region;
    this.bio = bio;
    this.phoneNumber = phoneNumber;
    this.authProvider = authProvider;
    this.authProviderId = authProviderId;
    this.lastLoginAt = lastLoginAt;
  }

  static fromDomain(user: UserEntity): UserResponse {
    return new UserResponse(
      user.id,
      user.nickname,
      user.profileImageUrl,
      user.gender,
      user.region,
      user.bio,
      user.phoneNumber,
      user.authProvider,
      user.authProviderId,
      user.lastLoginAt,
    );
  }
}
