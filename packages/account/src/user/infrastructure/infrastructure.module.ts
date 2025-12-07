import { Module, Provider } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { UserRepositoryPort } from "../domain/port/user-repository.port";
import { UserOrmRepository } from "./adapter/outbound/persistence/user.orm.repository";
import { UserController } from "./adapter/inbound/http/user/user.controller";
import { StorageModule } from "@core/storage";
import { UserStoragePort } from "../domain/port/user-storage.port";
import { UserStorageAdapter } from "./adapter/outbound/api/user-storage.adapter";
import { AdminUserContorller } from "./adapter/inbound/http/user/user.admin.controller";
import { HttpModule } from "@core/http";

const providers : Provider[] = [
    {
        provide : UserRepositoryPort,
        useClass : UserOrmRepository
    },
    {
        provide : UserStoragePort,
        useClass : UserStorageAdapter,
    }
]

@Module({
    imports : [
        HttpModule.forRoot(),
        StorageModule.forRootAsync({
            imports : [
                ConfigModule
            ],
            inject : [ConfigService],
            useFactory : (configService : ConfigService) => {
                return {
                    storageHost : configService.get<string>('STORAGE_HOST'),
                    bucket : 'ggt-user',
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
        AdminUserContorller,
    ],
    providers : providers,
    exports : providers,
})
export class UserInfraStructureModule {}