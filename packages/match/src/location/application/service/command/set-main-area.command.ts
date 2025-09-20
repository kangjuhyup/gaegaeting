import { CommandHandler } from "@nestjs/cqrs";
import { SetMainAreaCommand } from "../../port/command/set-main-area.port";
import { MainAreaEntity } from "@app/location/domain/model/main-area";
import { ICommandHandler } from "@nestjs/cqrs";
import { MainAreaRepositoryPort } from "@app/location/domain/port/main-area.repository.port";
import { Transactional } from "@core/database";

@CommandHandler(SetMainAreaCommand)
export class SetMainAreaHandler implements ICommandHandler<SetMainAreaCommand,MainAreaEntity> {
    
    constructor(
        private readonly mainAreaRepositoryPort : MainAreaRepositoryPort
    ) {}

    @Transactional()
    async execute(command: SetMainAreaCommand): Promise<MainAreaEntity> {
        const mainArea = new MainAreaEntity({
            code : command.code,
            name : command.name,
            parentCode : command.parentCode
        },command.user.userId)
        return await this.mainAreaRepositoryPort.saveMainArea(mainArea)
    }
}