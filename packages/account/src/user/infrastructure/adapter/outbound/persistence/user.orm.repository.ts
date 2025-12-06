import { UserEntity } from "@app/user/domain/model/user";
import { UserAttachmentOrmEntity, UserOrmEntity, BaseRepository } from "@core/database";
import { Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";
import { UserOrmMapper } from "./mapper/user-orm";
import { UserRepositoryPort } from "@app/user/domain/port/user-repository.port";
import { UserProfileEntity } from "@app/user/domain/model/user-profile";
import { UserProfileOrmMapper } from "./mapper/user-profile-orm";

@Injectable()
export class UserOrmRepository extends BaseRepository<UserOrmEntity> implements UserRepositoryPort {

    private userAttachmentRepository: BaseRepository<UserAttachmentOrmEntity>;

    constructor(dataSource: DataSource) {
        super(UserOrmEntity, dataSource);
        this.userAttachmentRepository = new BaseRepository(UserAttachmentOrmEntity, dataSource);
    }

    
    async insertUser(user: UserEntity): Promise<UserEntity> {
        const userOrm = UserOrmMapper.toOrm(user);
        const insertedUser = await this.getRepository().save(userOrm);
        return UserOrmMapper.toDomain(insertedUser);
    }
    
    async selectUserFromId(id: string): Promise<UserEntity> {
        const userOrm = await this.getRepository().findOneBy({ id });
        return UserOrmMapper.toDomain(userOrm);
    }

    async selectUserFromIdWithProfiles(id: string): Promise<UserEntity> {
        const userOrm = await this.getRepository().findOne({
            where : {
                id
            },
            relations : {
                attachments : true
            }
        })
        return UserOrmMapper.toDomain(userOrm);
    }

    async selectUserFromPhone(phoneNumber: string): Promise<UserEntity[]> {
        const userOrm = await this.getRepository().find({ where: { phoneNumber } });
        return userOrm.map(UserOrmMapper.toDomain);
    }

    async selectUserFromAuthProvider(providerType:number,providerId:string): Promise<UserEntity | undefined> {
        const userOrm = await this.getRepository().findOne({
            where : {
                auth : {
                    authProvider : providerType,
                    authProviderId : providerId,
                }
            }
        })
        if(userOrm){
            return UserOrmMapper.toDomain(userOrm);
        }
        return undefined;
    }

    async updateUser(user: UserEntity): Promise<UserEntity> {
        const userOrm = UserOrmMapper.toOrm(user);
        const updatedUser = await this.getRepository().save(userOrm);
        return UserOrmMapper.toDomain(updatedUser);
    }

    async hardDeleteUser(id: string): Promise<void> {
        await this.getRepository().delete(id);
    }

    async selectUserAttachment(userId: string, no: number): Promise<UserProfileEntity> {
        const userAttachmentOrm = await this.userAttachmentRepository.getRepository().findOne({ where: { userId, no } });
        return UserProfileOrmMapper.toDomain(userAttachmentOrm);
    }

    async insertUserAttachment(userAttachment : UserProfileEntity) : Promise<UserProfileEntity> {
        const userAttachmentOrm = UserProfileOrmMapper.toOrm(userAttachment);
        const insertedUserAttachment = await this.userAttachmentRepository.getRepository().save(userAttachmentOrm);
        return UserProfileOrmMapper.toDomain(insertedUserAttachment);
    }

    async updateUserAttachmentActive(userId: string, no: number, active: boolean): Promise<void> {
        await this.userAttachmentRepository.getRepository().update({ userId, no }, { isActive: active });
    }

    async deleteUserAttachment(userId : string, no : number) : Promise<void> {
        await this.userAttachmentRepository.getRepository().delete({ userId, no });
    }
}