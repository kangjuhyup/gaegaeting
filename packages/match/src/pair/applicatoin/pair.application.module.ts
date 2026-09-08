import { Module } from "@nestjs/common";
import { PairInfrastructureModule } from "../infrastructure/pair.infrastructure.module.js";

@Module({
    imports : [
        PairInfrastructureModule
    ]
})
export class PairApplicationModule{}