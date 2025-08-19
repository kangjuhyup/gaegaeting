import { Module, Provider } from "@nestjs/common";
import { LocationController } from "./presentation/location.controller";
import { LocationOrmRepository } from "./repository/location";
import { MainAreaOrmRepository } from "./repository/main-area";
import { MainAreaRepositoryPort } from "@location/domain/port/main-area.repository.port";
import { LocationRepositoryPort } from "@location/domain/port/location.repostiory.port";
import { LocationOrmMapper } from "./repository/mapper/location-orm";
import { MainAreaOrmMapper } from "./repository/mapper/main-area-orm";

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