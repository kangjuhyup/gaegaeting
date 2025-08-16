import { PersistenceEntity } from "@core/model";
import { UserGender, UserRegion, UserStatus } from "../enum/user.enum";
import { AuthEntity } from "@app/auth/domain/model/auth";
import { UserProfileEntity } from "./user-profile";



interface IUser {
  email? : string;
  passwordHash?: string;
  nickname: string;
  gender: UserGender;
  birthDate: Date;
  region: UserRegion;
  bio?: string;
  phoneNumber?: string;
  status: UserStatus;
  profiles? : UserProfileEntity[]
}

/**
 * 사용자 도메인 엔티티
 */
export class UserEntity extends PersistenceEntity<string, IUser> {


  private constructor(param:IUser) {
    super(param);
  }

  static of(param: IUser) {
    if(param.profiles) {
      param.profiles = param.profiles.map((profile) => profile.setPersistence(profile.id,profile.createdAt,profile.updatedAt));
    }
    return new UserEntity(param);
  }
  
  get email(): string {
    return this.etc.email;
  }
  get passwordHash(): string | undefined {
    return this.etc.passwordHash;
  }
  get nickname(): string {
    return this.etc.nickname;
  }
  get gender(): UserGender {
    return this.etc.gender;
  }
  get birthDate(): Date {
    return new Date(this.etc.birthDate);
  }
  get region(): UserRegion {
    return this.etc.region;
  }
  get bio(): string | undefined {
    return this.etc.bio;
  }
  get phoneNumber(): string | undefined {
    return this.etc.phoneNumber;
  }
  get status(): UserStatus {
    return this.etc.status;
  }

  get profiles() : UserProfileEntity[] {
    return this.etc.profiles;
  }

  updateInfo(param : {
    nickname?: string;
    gender?: UserGender;
    region?: UserRegion;
    bio?: string;
  }) {
    if(param.nickname) {
      this.etc.nickname = param.nickname;
    }
    if(param.gender) {
      this.etc.gender = param.gender;
    }
    if(param.region) {
      this.etc.region = param.region;
    }
    if(param.bio) {
      this.etc.bio = param.bio;
    }
    return this;
  }

  hasProfiles() {
    return this.etc.profiles?.length > 0;
  }

  removeUnActiveProfiles() {
    this.etc.profiles = this.etc.profiles.filter((profile) => profile.isActive)
  }

  /**
   * 사용자가 활성 상태인지 확인
   */
  isActive(): boolean {
    return this.status === UserStatus.ACTIVE;
  }
}
