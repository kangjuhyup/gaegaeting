import { Module } from "@nestjs/common";
import { UserApplicationModule } from "./application/application.module";
@Module({
    imports : [
        UserApplicationModule
    ]
})
export class UserModule {}