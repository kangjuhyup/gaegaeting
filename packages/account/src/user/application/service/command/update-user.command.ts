
import { UserRepositoryPort } from "@app/user/domain/port/out/user-repository.port";
import { UserEntity } from "@app/user/domain/model/user";
import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { UpdateUserCommand } from "../../port/in/command/update-user.port";

@CommandHandler(UpdateUserCommand)
export class UpdateUserHandler implements ICommandHandler<UpdateUserCommand> {

    constructor(
        private readonly userRepository : UserRepositoryPort
    ) {}

    async execute(command: UpdateUserCommand): Promise<UserEntity> {
        const existsUser = await this.userRepository.selectUserFromId(command.id);
        if(!existsUser) {
            throw new Error("존재하지 않는 사용자입니다.");
        }
        existsUser.updateProfile(
            command.data.nickname,
            command.data.profileImageUrl,
            command.data.gender,
            command.data.region,
            command.data.bio,
        )
        const user = await this.userRepository.updateUser(existsUser);
        //TODO: 유저 업데이트 이벤트 발행
        return user;
    }
}