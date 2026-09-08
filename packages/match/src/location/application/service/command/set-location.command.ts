import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";
import { SetLocationCommand } from "../../port/command/set-location.port.js";
import { LocationEntity } from "#app/location/domain/model/location";
import { LocationRepositoryPort } from "#app/location/domain/port/location.repostiory.port";
import { Transactional } from "@core/database";

@CommandHandler(SetLocationCommand)
export class SetLocationHandler implements ICommandHandler<SetLocationCommand,LocationEntity> {
    
    constructor(
        private readonly locationRepositoryPort : LocationRepositoryPort,
    ) {}

    @Transactional()
    async execute(command: SetLocationCommand): Promise<LocationEntity> {
        const userLocation = await this.locationRepositoryPort.selectLocationFromUserId(command.user.userId);
        if(userLocation) {
            return userLocation;
        }
        const location = LocationEntity.of({
            latitude: command.location.latitude,
            longitude: command.location.longitude,
        },command.user.userId);
        return await this.locationRepositoryPort.saveLocation(location)
    }
}