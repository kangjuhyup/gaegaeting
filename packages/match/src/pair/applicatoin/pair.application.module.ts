import { Module } from "@nestjs/common";
import { PairInfrastructureModule } from "../infrastructure/pair.infrastructure.module";

@Module({
    imports : [
        PairInfrastructureModule
    ]
})
export class PairApplicationModule{}