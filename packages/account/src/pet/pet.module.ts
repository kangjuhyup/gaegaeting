import { Module } from "@nestjs/common";
import { PetApplicationModule } from "./application/application.module";

@Module({
    imports : [
        PetApplicationModule
    ],
})
export class PetModule {}