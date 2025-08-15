import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { CreateUserCommand } from "../../port/in/command/create-user.port";
import { UserRepositoryPort } from "@app/user/domain/port/out/user-repository.port";
import { UserEntity } from "@app/user/domain/model/user";

@CommandHandler(CreateUserCommand)
export class CreateUserHandler implements ICommandHandler<CreateUserCommand> {
  constructor(private readonly userRepository: UserRepositoryPort) {}

  async execute(command: CreateUserCommand): Promise<UserEntity> {
    const existsUser = await this.userRepository.selectUserFromPhone(
      command.user.phoneNumber,
    );

    //TODO : softdelete 때문에 length 뿐만 아니라 isActive 도 확인해야한다.
    if (existsUser.length > 0) {
      throw new Error("이미 존재하는 사용자입니다.");
    }
    const user = await this.userRepository.insertUser(command.user);
    
    return user;
  }
}
