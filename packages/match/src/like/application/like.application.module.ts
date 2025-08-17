import { Module } from "@nestjs/common";
import { LikeInfrastructureModule } from "../infrastructure/like.infrastructure.module";

@Module({
    imports : [
        LikeInfrastructureModule
    ]
})
export class LikeApplicationModule{}