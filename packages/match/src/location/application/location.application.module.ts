import { Module, type Provider } from "@nestjs/common";
import { LocationInfrastructureModule } from "../infrastructure/location.infrastructure.module.js";
import { SetMainAreaHandler } from "./service/command/set-main-area.command.js";
import { SetLocationHandler } from "./service/command/set-location.command.js";
import { GetMainAreaHandler } from "./service/query/get-main-area.query.js";

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