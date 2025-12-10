import { Module, Provider } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { StorageModule } from "@core/storage";
import { PetOrmMapper } from "./adapter/outbound/persistence/mapper/pet-orm";
import { PetStoragePort } from "./port/pet-storage.port";
import { PetStorageAdpater } from "./adapter/outbound/api/pet-storage.adpater";
import { PetProfileOrmMapper } from "./adapter/outbound/persistence/mapper/pet-profile-orm";
import { HttpModule } from "@core/http";
import { PetCertificationPort } from "./port/pet-certification.port";
import { PetCertificationAdapter } from "./adapter/outbound/api/pet-certification.adapter";
import { PetProfileRepositoryPort } from "./port/pet-profile-repository.port";
import { PetProfileOrmRepository } from "./adapter/outbound/persistence/pet-profile-orm.repository";
import { PetAttachmentOrmRepository } from "./adapter/outbound/persistence/pet-attachment-orm.repository";
import { PetAttachmentRepositoryPort } from "./port/pet-attachment-repository.port";

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
                    storageHost : configService.get<string>('STORAGE_HOST'),
                    bucket : 'ggt-pet',
                    prefix : configService.get<string>('STORAGE_PREFIX'),
                    region : configService.get<string>('STORAGE_REGION'),
                    accessKeyId : configService.get<string>('STORAGE_ACCESS_KEY_ID'),
                    secretAccessKey : configService.get<string>('STORAGE_SECRET_ACCESS_KEY'),
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