import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { SetLocationCommand } from "../../port/command/set-location.port";
import { LocationEntity } from "@app/location/domain/model/location";
import { LocationRepositoryPort } from "@app/location/domain/port/location.repostiory.port";

@CommandHandler(SetLocationCommand)
export class SetLocationHandler implements ICommandHandler<SetLocationCommand,LocationEntity> {
    
    constructor(
        private readonly locationRepositoryPort : LocationRepositoryPort
    ) {}

    async execute(command: SetLocationCommand): Promise<LocationEntity> {
        return await this.locationRepositoryPort.saveLocation(command.location)
    }
}