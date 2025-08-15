import { UserEntity } from "@app/user/domain/model/user";
import { ProfileEntity } from "../../model/profile";

export abstract class UserRepositoryPort {
  abstract insertUser(user: UserEntity): Promise<UserEntity>;
  abstract selectUserFromId(id: string): Promise<UserEntity>;
  abstract selectUserFromPhone(phoneNumber: string): Promise<UserEntity[]>;
  abstract updateUser(user: UserEntity): Promise<UserEntity>;
  abstract hardDeleteUser(id: string): Promise<void>;

  abstract insertUserAttachment(userAttachment : ProfileEntity) : Promise<ProfileEntity>
}
