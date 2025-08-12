import { DeleteUserCommand } from "../../port/in/command/delete-user.port";
import { UserStatus } from "@app/user/domain/model/user";
import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { UserRepositoryPort } from "@app/user/domain/port/out/user-repository.port";

@CommandHandler(DeleteUserCommand)
export class DeleteUserHandler implements ICommandHandler<DeleteUserCommand, boolean> {
    constructor(private readonly userRepository : UserRepositoryPort) {}
    async execute(command : DeleteUserCommand) : Promise<boolean> {
        const existsUser = await this.userRepository.selectUserFromId(command.id);
        if (!existsUser) {
            throw new Error("존재하지 않는 사용자입니다.");
        }
        existsUser.updateStatus(
            UserStatus.DELETED
        )
        await this.userRepository.updateUser(existsUser);
        return true;
    }
}