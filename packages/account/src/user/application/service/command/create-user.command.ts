import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { CreateUserCommand } from "../../port/command/create-user.port";
import { UserRepositoryPort } from "@app/user/domain/port/user-repository.port";
import { UserEntity } from "@app/user/domain/model/user";
import { AuthInternalApiPort } from "@app/user/domain/port/auth-internal-api.port";

@CommandHandler(CreateUserCommand)
export class CreateUserHandler implements ICommandHandler<CreateUserCommand, UserEntity> {
  constructor(
    private readonly userRepository: UserRepositoryPort,
    private readonly authInternalApiPort : AuthInternalApiPort
  ) {}

  async execute(command: CreateUserCommand): Promise<UserEntity> {
    const existsUser = await this.userRepository.selectUserFromAuthProvider(
      command.providerType,
      command.providerId
    );

    if (existsUser) {
      throw new Error("이미 존재하는 사용자입니다.");
    }
    const user = await this.userRepository.insertUser(command.user);
    await this.authInternalApiPort.setUserId(command.providerType, command.providerId, user.id);
    return user;
  }
}
