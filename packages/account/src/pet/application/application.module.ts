import { Module, type Provider } from "@nestjs/common";
import { PetInfraStructureModule } from "../infrastructure/infrastructure.module.js";
import { GetPetHandler } from "./service/query/get-pet.query.js";
import { GetPetsHandler } from "./service/query/get-pets.query.js";
import { RegisterPetHandler } from "./service/command/register-pet.command.js";
import { GeneratePetPresignedUrlHandler } from "./service/command/generate-pet-presigned.command.js";
import { UpdatePetHandler } from "./service/command/update-pet.command.js";
import { CertifyPetHandler } from "./service/command/certify-pet.command.js";


const providers : Provider[] = [
    
    // Query
    GetPetHandler,
    GetPetsHandler,
    // Command
    RegisterPetHandler,
    UpdatePetHandler,
    CertifyPetHandler,
    GeneratePetPresignedUrlHandler
]

@Module({
    imports: [
        PetInfraStructureModule,
    ],
    providers : providers,
    exports : providers,
})
export class PetApplicationModule {}