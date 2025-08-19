import { Module, Provider } from "@nestjs/common";
import { LocationInfrastructureModule } from "../infrastructure/location.infrastructure.module";
import { SetMainAreaHandler } from "./service/command/set-main-area.command";
import { SetLocationHandler } from "./service/command/set-location.command";
import { GetMainAreaHandler } from "./service/query/get-main-area.query";

const providers : Provider[] = [
    // Query
    GetMainAreaHandler,

    // Command
    SetMainAreaHandler,
    SetLocationHandler,
]

@Module({
    imports : [
        LocationInfrastructureModule
    ],
    providers : [
        ...providers
    ],
    exports : [
        ...providers
    ]
})
export class LocationApplicationModule{}