import { Module, Provider } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { UserProfileRepositoryPort } from "./port/user-profile-repository.port";
import { UserAttachmentRepositoryPort } from "./port/user-attachment-repository.port";
import { UserProfileOrmRepository } from "./adapter/outbound/persistence/user-profile-orm.repository";
import { UserAttachmentOrmRepository } from "./adapter/outbound/persistence/user-attachment-orm.repository";
import { StorageModule } from "@core/storage";
import { UserStoragePort } from "./port/user-storage.port";
import { UserStorageAdapter } from "./adapter/outbound/api/user-storage.adapter";
import { AdminUserContorller } from "./adapter/inbound/http/user/user.admin.controller";
import { HttpModule } from "@core/http";

const providers : Provider[] = [
    {
        provide : UserProfileRepositoryPort,
        useClass : UserProfileOrmRepository
    },
    {
        provide : UserAttachmentRepositoryPort,
        useClass : UserAttachmentOrmRepository
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
        AdminUserContorller,
    ],
    providers : providers,
    exports : providers,
})
export class UserInfraStructureModule {}