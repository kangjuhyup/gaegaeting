import { Module, type Provider } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { UserProfileRepositoryPort } from "./port/user-profile-repository.port.js";
import { UserAttachmentRepositoryPort } from "./port/user-attachment-repository.port.js";
import { UserProfileOrmRepository } from "./adapter/outbound/persistence/user-profile-orm.repository.js";
import { UserAttachmentOrmRepository } from "./adapter/outbound/persistence/user-attachment-orm.repository.js";
import { StorageModule } from "@core/storage";
import { UserStoragePort } from "./port/user-storage.port.js";
import { UserStorageAdapter } from "./adapter/outbound/api/user-storage.adapter.js";
import { AdminUserContorller } from "./adapter/inbound/http/user/user.admin.controller.js";
import { HttpModule } from "@core/http";
import { ENV_KEY } from "#app/config/env.config";
import { ExternalUserSubjectRepositoryPort } from './port/external-user-subject-repository.port.js';
import { ExternalUserSubjectOrmRepository } from './adapter/outbound/persistence/external-user-subject-orm.repository.js';
import { ResolveExternalUserSubjectService } from '../application/service/resolve-external-user-subject.service.js';
import { ExternalUserSubjectController } from './adapter/inbound/http/user/external-user-subject.controller.js';

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
    },
    ResolveExternalUserSubjectService,
    { provide: ExternalUserSubjectRepositoryPort, useClass: ExternalUserSubjectOrmRepository },
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
                    storageHost : configService.get<string>(ENV_KEY.STORAGE_HOST),
                    bucket : configService.get<string>(ENV_KEY.STORAGE_USER_BUCKET),
                    prefix : configService.get<string>(ENV_KEY.STORAGE_PROFILE_PREFIX),
                    region : configService.get<string>(ENV_KEY.STORAGE_REGION),
                    accessKeyId : configService.get<string>(ENV_KEY.STORAGE_ACCESS_KEY_ID),
                    secretAccessKey : configService.get<string>(ENV_KEY.STORAGE_SECRET_ACCESS_KEY),
                }
            }
        })
    ],
    controllers : [
        AdminUserContorller,
        ExternalUserSubjectController,
    ],
    providers : providers,
    exports : providers,
})
export class UserInfraStructureModule {}
