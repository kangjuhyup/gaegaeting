import { PersistenceEntity } from "@core/model";
import { UserGender, UserRegion, UserStatus } from "../enum/user.enum";
import { AuthEntity } from "@app/auth/domain/model/auth";



interface IUser {
  email? : string;
  passwordHash?: string;
  nickname: string;
  profiles?: string;
  gender: UserGender;
  birthDate: Date;
  region: UserRegion;
  bio?: string;
  phoneNumber?: string;
  status: UserStatus;
}

/**
 * 사용자 도메인 엔티티
 */
export class UserEntity extends PersistenceEntity<string, IUser> {


  private constructor(param:IUser) {
    super(param);
  }

  static of(param: IUser) {
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


  /**
   * 사용자가 활성 상태인지 확인
   */
  isActive(): boolean {
    return this.status === UserStatus.ACTIVE;
  }
}
