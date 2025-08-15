import { UserEntity } from "@app/user/domain/model/user";
import { UserAttachmentOrmEntity, UserOrmEntity } from "@core/database";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { UserOrmMapper } from "./mapper/user-orm";
import { UserRepositoryPort } from "@app/user/domain/port/out/user-repository.port";
import { ProfileEntity } from "@app/user/domain/model/profile";
import { ProfileOrmMapper } from "./mapper/profile-orm";

@Injectable()
export class UserOrmRepository implements UserRepositoryPort {

    constructor(
        @InjectRepository(UserOrmEntity)
        private readonly userRepository : Repository<UserOrmEntity>,
        @InjectRepository(UserAttachmentOrmEntity)
        private readonly userAttachmentRepository : Repository<UserAttachmentOrmEntity>
    ) {}
    
    async insertUser(user: UserEntity): Promise<UserEntity> {
        const userOrm = UserOrmMapper.toOrm(user);
        const insertedUser = await this.userRepository.save(userOrm);
        return UserOrmMapper.toDomain(insertedUser);
    }
    
    async selectUserFromId(id: string): Promise<UserEntity> {
        const userOrm = await this.userRepository.findOneBy({ id });
        return UserOrmMapper.toDomain(userOrm);
    }

    async selectUserFromPhone(phoneNumber: string): Promise<UserEntity[]> {
        const userOrm = await this.userRepository.find({ where: { phoneNumber } });
        return userOrm.map(UserOrmMapper.toDomain);
    }

    async updateUser(user: UserEntity): Promise<UserEntity> {
        const userOrm = UserOrmMapper.toOrm(user);
        const updatedUser = await this.userRepository.save(userOrm);
        return UserOrmMapper.toDomain(updatedUser);
    }

    async hardDeleteUser(id: string): Promise<void> {
        await this.userRepository.delete(id);
    }

    async insertUserAttachment(userAttachment : ProfileEntity) : Promise<ProfileEntity> {
        const userAttachmentOrm = ProfileOrmMapper.toOrm(userAttachment);
        const insertedUserAttachment = await this.userAttachmentRepository.save(userAttachmentOrm);
        return ProfileOrmMapper.toDomain(insertedUserAttachment);
    }
}