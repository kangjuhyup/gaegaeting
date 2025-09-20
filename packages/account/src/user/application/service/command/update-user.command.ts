
import { UserRepositoryPort } from "@app/user/domain/port/user-repository.port";
import { UserEntity } from "@app/user/domain/model/user";
import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { UpdateUserCommand } from "../../port/command/update-user.port";
import { Transactional } from "@core/database";

@CommandHandler(UpdateUserCommand)
export class UpdateUserHandler implements ICommandHandler<UpdateUserCommand> {

    constructor(
        private readonly userRepository : UserRepositoryPort
    ) {}

    @Transactional()
    async execute(command: UpdateUserCommand): Promise<UserEntity> {
        const existsUser = await this.userRepository.selectUserFromId(command.id);
        if(!existsUser) {
            throw new Error("존재하지 않는 사용자입니다.");
        }
        existsUser.updateInfo(command.data);
        const user = await this.userRepository.updateUser(existsUser);
        return user;
    }
}
