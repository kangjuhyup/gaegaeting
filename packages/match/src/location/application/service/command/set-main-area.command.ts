import { CommandHandler } from "@nestjs/cqrs";
import { SetMainAreaCommand } from "../../port/command/set-main-area.port";
import { MainAreaEntity } from "@app/location/domain/model/main-area";
import { ICommandHandler } from "@nestjs/cqrs";
import { MainAreaRepositoryPort } from "@app/location/domain/port/main-area.repository.port";

@CommandHandler(SetMainAreaCommand)
export class SetMainAreaHandler implements ICommandHandler<SetMainAreaCommand,MainAreaEntity> {
    
    constructor(
        private readonly mainAreaRepositoryPort : MainAreaRepositoryPort
    ) {}

    async execute(command: SetMainAreaCommand): Promise<MainAreaEntity> {
        return await this.mainAreaRepositoryPort.saveMainArea(command.mainArea)
    }
}