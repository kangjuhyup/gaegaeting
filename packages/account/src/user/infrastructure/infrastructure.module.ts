import { DatabaseModule, DatabaseSchema } from "@core/database";
import { Module, Provider } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { UserRepositoryPort } from "../domain/port/out/user-repository.port";
import { UserOrmRepository } from "./repository/user";
import { UserController } from "./presentation/user/user.controller";
import { PetController } from "./presentation/pet/pet.controller";

const providers : Provider[] = [
    {
        provide : UserRepositoryPort,
        useClass : UserOrmRepository
    }
]

@Module({
    imports : [
        DatabaseModule.forRootAsync(
            {
                imports : [
                    ConfigModule
                ],
                inject : [ConfigService]
            },
            [DatabaseSchema.USER],
        ),
    ],
    controllers : [
        UserController,
        PetController,
    ],
    providers : providers,
    exports : providers,
})
export class UserInfraStructureModule {}