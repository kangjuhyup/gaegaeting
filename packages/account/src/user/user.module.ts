import { Module } from "@nestjs/common";
import { UserInfraStructureModule } from "./infrastructure/infrastructure.module";

@Module({
    imports : [
        UserInfraStructureModule
    ]
})
export class UserModule {}