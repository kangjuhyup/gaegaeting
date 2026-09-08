import { Module, type Provider } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { StorageModule } from "@core/storage";
import { PetOrmMapper } from "./adapter/outbound/persistence/mapper/pet-orm.js";
import { PetStoragePort } from "./port/pet-storage.port.js";
import { PetStorageAdpater } from "./adapter/outbound/api/pet-storage.adpater.js";
import { PetProfileOrmMapper } from "./adapter/outbound/persistence/mapper/pet-profile-orm.js";
import { HttpModule } from "@core/http";
import { PetCertificationPort } from "./port/pet-certification.port.js";
import { PetCertificationAdapter } from "./adapter/outbound/api/pet-certification.adapter.js";
import { PetProfileRepositoryPort } from "./port/pet-profile-repository.port.js";
import { PetProfileOrmRepository } from "./adapter/outbound/persistence/pet-profile-orm.repository.js";
import { PetAttachmentOrmRepository } from "./adapter/outbound/persistence/pet-attachment-orm.repository.js";
import { PetAttachmentRepositoryPort } from "./port/pet-attachment-repository.port.js";
import { ENV_KEY } from "#app/config/env.config";

const providers : Provider[] = [
    PetOrmMapper,
    PetProfileOrmMapper,
    // 개별 리포지토리
    {
        provide : PetProfileRepositoryPort,
        useClass : PetProfileOrmRepository
    },
    {
        provide : PetAttachmentRepositoryPort,
        useClass : PetAttachmentOrmRepository
    },
    {
        provide : PetStoragePort,
        useClass : PetStorageAdpater
    },
    {
        provide : PetCertificationPort,
        useClass : PetCertificationAdapter
    }
]

@Module({
    imports : [
        HttpModule.forService('Account-Pet', {
            timeout : 5000,
            retryCount : 3,
        }),
        StorageModule.forRootAsync({
            imports : [
                ConfigModule
            ],
            inject : [ConfigService],
            useFactory : (configService : ConfigService) => {
                return {
                    storageHost : configService.get(ENV_KEY.STORAGE_HOST),
                    bucket : configService.get<string>(ENV_KEY.STORAGE_PET_BUCKET),
                    prefix : configService.get<string>(ENV_KEY.STORAGE_PROFILE_PREFIX),
                    region : configService.get<string>(ENV_KEY.STORAGE_REGION),
                    accessKeyId : configService.get<string>(ENV_KEY.STORAGE_ACCESS_KEY_ID),
                    secretAccessKey : configService.get<string>(ENV_KEY.STORAGE_SECRET_ACCESS_KEY),
                }
            }
        })
    ],
    controllers : [
    ],
    providers : providers,
    exports : providers,
})
export class PetInfraStructureModule {}