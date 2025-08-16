import { UserEntity } from "@app/user/domain/model/user";
import { UserProfileEntity } from "../../model/user-profile";

export abstract class UserRepositoryPort {
  abstract insertUser(user: UserEntity): Promise<UserEntity>;
  abstract selectUserFromId(id: string): Promise<UserEntity>;

  abstract selectUserFromIdWithProfiles(id: string): Promise<UserEntity>;
  abstract selectUserFromPhone(phoneNumber: string): Promise<UserEntity[]>;

  abstract selectUserFromAuthProvider(providerType : number, providerId : string) : Promise<UserEntity|undefined>
  abstract updateUser(user: UserEntity): Promise<UserEntity>;
  abstract hardDeleteUser(id: string): Promise<void>;

  abstract selectUserAttachment(userId: string, no : number) : Promise<UserProfileEntity>
  abstract insertUserAttachment(userAttachment : UserProfileEntity) : Promise<UserProfileEntity>

  abstract updateUserAttachmentActive(userId: string, no : number , active : boolean) : Promise<void>

  abstract deleteUserAttachment(userId: string, no : number) : Promise<void>
}
