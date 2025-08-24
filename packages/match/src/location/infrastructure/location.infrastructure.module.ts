import { Module, Provider } from "@nestjs/common";
import { LocationController } from "./adapter/inbound/http/location.controller";
import { LocationOrmRepository } from "./adapter/outbound/presistence/location";
import { MainAreaOrmRepository } from "./adapter/outbound/presistence/main-area";
import { MainAreaRepositoryPort } from "@location/domain/port/main-area.repository.port";
import { LocationRepositoryPort } from "@location/domain/port/location.repostiory.port";
import { LocationOrmMapper } from "./adapter/outbound/presistence/mapper/location-orm";
import { MainAreaOrmMapper } from "./adapter/outbound/presistence/mapper/main-area-orm";

const providers : Provider[] = [
    LocationOrmMapper,
    MainAreaOrmMapper,
    {
        provide : LocationRepositoryPort,
        useClass : LocationOrmRepository
    },
    {
        provide : MainAreaRepositoryPort,
        useClass : MainAreaOrmRepository
    }
]

@Module({
    controllers: [
        LocationController
    ],
    providers,
    exports : providers
})
export class LocationInfrastructureModule {}