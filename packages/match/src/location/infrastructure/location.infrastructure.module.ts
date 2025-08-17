import { Module, Provider } from "@nestjs/common";
import { LocationController } from "./presentation/location.controller";

const providers : Provider[] = []

@Module({
    controllers: [
        LocationController
    ]
})
export class LocationInfrastructureModule {}