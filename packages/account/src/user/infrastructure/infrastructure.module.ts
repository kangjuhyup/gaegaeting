import { DatabaseModule, DatabaseSchema } from "@core/database";
import { Module, Provider } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { UserRepositoryPort } from "../domain/port/out/user-repository.port";
import { UserOrmRepository } from "./repository/user";
import { UserController } from "./presentation/user/user.controller";
import { PetController } from "./presentation/pet/pet.controller";
import { StorageModule } from "@core/storage";

const providers : Provider[] = [
    {
        provide : UserRepositoryPort,
        useClass : UserOrmRepository
    },
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
        StorageModule.forRootAsync({
            imports : [
                ConfigModule
            ],
            inject : [ConfigService],
            useFactory : (configService : ConfigService) => {
                return {
                    storageHost : configService.get<string>('STORAGE_HOST'),
                    bucket : configService.get<string>('STORAGE_BUCKET'),
                    prefix : configService.get<string>('STORAGE_PREFIX'),
                    region : configService.get<string>('STORAGE_REGION'),
                    accessKeyId : configService.get<string>('STORAGE_ACCESS_KEY_ID'),
                    secretAccessKey : configService.get<string>('STORAGE_SECRET_ACCESS_KEY'),
                }
            }
        })
    ],
    controllers : [
        UserController,
        PetController,
    ],
    providers : providers,
    exports : providers,
})
export class UserInfraStructureModule {}