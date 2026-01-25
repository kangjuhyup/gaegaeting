import { PersistenceEntity } from "@core/model";
import { UserGender, UserRegion } from "../enum/user.enum";
import { UserProfileStatus } from "@core/database";

/**
 * 사용자 프로필 도메인 엔티티
 * 
 * UserProfileOrmEntity와 대응되는 도메인 엔티티입니다.
 * 사용자의 프로필 정보를 나타냅니다.
 */
export interface IUserProfile {
    name: string;
    nickname: string;
    gender: UserGender;
    birthDate: Date;
    region: UserRegion;
    bio?: string;
    status: UserProfileStatus;
    phoneNumber?: string;
}

/**
 * 사용자 프로필 엔티티
 * 
 * UserProfileOrmEntity와 대응되는 도메인 엔티티입니다.
 */
export class UserProfileEntity extends PersistenceEntity<string, IUserProfile> {
    private constructor(param: IUserProfile, id?: string) {
        super(param, id);
    }

    static of(param: IUserProfile, id?: string) {
        // 생성 경로에 따라 status가 null로 들어오는 케이스가 있어 기본값만 보정
        if (param.status == null) {
            param.status = UserProfileStatus.ACTIVE;
        }
        return new UserProfileEntity(param, id);
    }

    get name(): string {
        return this.etc.name;
    }

    get nickname(): string {
        return this.etc.nickname;
    }

    get gender(): UserGender {
        return this.etc.gender;
    }

    get birthDate(): Date {
        return this.etc.birthDate;
    }

    get region(): UserRegion {
        return this.etc.region;
    }

    get bio(): string | undefined {
        return this.etc.bio;
    }

    get status(): UserProfileStatus {
        return this.etc.status;
    }

    get phoneNumber(): string | undefined {
        return this.etc.phoneNumber;
    }

    /**
     * 프로필 정보 업데이트
     */
    updateInfo(param: {
        nickname?: string;
        gender?: UserGender;
        region?: UserRegion;
        bio?: string;
        phoneNumber?: string;
    }) {
        if (param.nickname !== undefined) {
            this.etc.nickname = param.nickname;
        }
        if (param.gender !== undefined) {
            this.etc.gender = param.gender;
        }
        if (param.region !== undefined) {
            this.etc.region = param.region;
        }
        if (param.bio !== undefined) {
            this.etc.bio = param.bio;
        }
        if (param.phoneNumber !== undefined) {
            this.etc.phoneNumber = param.phoneNumber;
        }
        return this;
    }

    /**
     * 상태 업데이트
     */
    updateStatus(status: UserProfileStatus) {
        this.etc.status = status;
        return this;
    }
}