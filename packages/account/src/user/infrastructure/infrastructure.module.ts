import { DatabaseModule, DatabaseSchema } from "@core/database";
import { Module, Provider } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { UserRepositoryPort } from "../domain/port/out/user-repository.port";
import { UserOrmRepository } from "./repository/user";
import { UserController } from "./presentation/user/user.controller";
import { PetController } from "./presentation/pet/pet.controller";
import { StorageModule } from "@core/storage";
import { AuthInternalApiAdapter } from "./adapter/auth-internal-api.adpater";
import { AuthInternalApiPort } from "../domain/port/out/auth-internal-api.port";
import { AuthOrmRepository } from "@app/auth/infrastructure/repository/auth.repository";
import { AuthMapper } from "@app/auth/infrastructure/repository/mapper/auth.mapper";

const providers : Provider[] = [
    {
        provide : UserRepositoryPort,
        useClass : UserOrmRepository
    },
    // TODO: AuthInternalApiAdapter 가 Api Client 의존성을 가지게 되면 제거
    AuthOrmRepository,
    AuthMapper,
    {
        provide : AuthInternalApiPort,
        useClass : AuthInternalApiAdapter,
    }
]

@Module({
    imports : [
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