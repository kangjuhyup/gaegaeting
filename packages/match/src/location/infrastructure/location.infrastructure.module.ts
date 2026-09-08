import { Module, type Provider } from "@nestjs/common";
import { LocationResolver } from "./adapter/inbound/gql/location.resolver.js";
import { LocationOrmRepository } from "./adapter/outbound/presistence/location.orm.repository.js";
import { MainAreaOrmRepository } from "./adapter/outbound/presistence/main-area.js";
import { MainAreaRepositoryPort } from '#app/location/domain/port/main-area.repository.port';
import { LocationRepositoryPort } from '#app/location/domain/port/location.repostiory.port';
import { LocationOrmMapper } from "./adapter/outbound/presistence/mapper/location-orm.js";
import { MainAreaOrmMapper } from "./adapter/outbound/presistence/mapper/main-area-orm.js";

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
    providers: [
        ...providers,
        LocationResolver,
    ],
    exports : providers
})
export class LocationInfrastructureModule {}
