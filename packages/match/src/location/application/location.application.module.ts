import { Module } from "@nestjs/common";
import { LocationInfrastructureModule } from "../infrastructure/location.infrastructure.module";

@Module({
    imports : [
        LocationInfrastructureModule
    ]
})
export class LocationApplicationModule{}