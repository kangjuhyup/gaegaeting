import { DatabaseModule, DatabaseSchema } from "@core/database";
import { Module, Provider } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { PetController } from "../../pet/infrastructure/presentation/pet/pet.controller";
import { StorageModule } from "@core/storage";
import { PetRepositoryPort } from "../domain/port/out/pet-repository.port";
import { PetOrmRepository } from "./repository/pet";
import { PetOrmMapper } from "./repository/mapper/pet-orm";
import { PetStoragePort } from "../domain/port/out/pet-storage.port";
import { PetStorageAdpater } from "./adapter/pet-storage.adpater";
import { PetProfileOrmMapper } from "./repository/mapper/pet-profile-orm";
import { HttpModule } from "@core/http";
import { PetCertificationPort } from "../domain/port/out/pet-certification.port";
import { PetCertificationAdapter } from "./adapter/pet-certification.adapter";

const providers : Provider[] = [
    PetOrmMapper,
    PetProfileOrmMapper,
    {
        provide : PetRepositoryPort,
        useClass : PetOrmRepository
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
        PetController,
    ],
    providers : providers,
    exports : providers,
})
export class PetInfraStructureModule {}