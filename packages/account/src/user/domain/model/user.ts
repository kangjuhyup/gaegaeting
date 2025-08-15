import { PersistenceEntity } from "@core/model";
import { UserGender, UserRegion, UserStatus } from "../enum/user.enum";



interface IUser {
  passwordHash?: string;
  nickname: string;
  profiles?: string;
  gender: UserGender;
  birthDate: Date;
  region: UserRegion;
  bio?: string;
  phoneNumber: string;
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
  
  // Getters
  get id(): string {
    return this.id;
  }
  get email(): string {
    return this.email;
  }
  get passwordHash(): string | undefined {
    return this.passwordHash;
  }
  get nickname(): string {
    return this.nickname;
  }
  get gender(): UserGender {
    return this.gender;
  }
  get birthDate(): Date {
    return new Date(this.birthDate);
  }
  get region(): UserRegion {
    return this.region;
  }
  get bio(): string | undefined {
    return this.bio;
  }
  get phoneNumber(): string | undefined {
    return this.phoneNumber;
  }
  get status(): UserStatus {
    return this.status;
  }
  get createdAt(): Date {
    return new Date(this.createdAt);
  }
  get updatedAt(): Date {
    return new Date(this.updatedAt);
  }

  /**
   * 사용자가 활성 상태인지 확인
   */
  isActive(): boolean {
    return this.status === UserStatus.ACTIVE;
  }
}
