
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
        console.log(command);
        const existsUser = await this.userRepository.selectUserFromId(command.id);
        console.log(existsUser);
        if(!existsUser) {
            throw new Error("존재하지 않는 사용자입니다.");
        }
        existsUser.updateInfo(command.data);
        console.log(existsUser);
        const user = await this.userRepository.updateUser(existsUser);
        return user;
    }
}