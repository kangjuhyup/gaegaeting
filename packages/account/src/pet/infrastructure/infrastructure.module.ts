import { DatabaseModule, DatabaseSchema } from "@core/database";
import { Module, Provider } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { PetController } from "../../pet/infrastructure/presentation/pet/pet.controller";
import { StorageModule } from "@core/storage";
import { PetRepositoryPort } from "../domain/port/out/pet-repository.port";
import { PetOrmRepository } from "./repository/pet";

const providers : Provider[] = [
    {
        provide : PetRepositoryPort,
        useClass : PetOrmRepository
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