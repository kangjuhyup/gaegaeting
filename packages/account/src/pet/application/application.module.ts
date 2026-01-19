import { Module, Provider } from "@nestjs/common";
import { PetInfraStructureModule } from "../infrastructure/infrastructure.module";
import { GetPetHandler } from "./service/query/get-pet.query";
import { GetPetsHandler } from "./service/query/get-pets.query";
import { GetPetsByUserIdsHandler } from "./service/query/get-pets-by-user-ids.query";
import { GetPetAttachmentsByPetIdsHandler } from "./service/query/get-pet-attachments-by-pet-ids.query";
import { RegisterPetHandler } from "./service/command/register-pet.command";
import { GeneratePetPresignedUrlHandler } from "./service/command/generate-pet-presigned.command";
import { UpdatePetHandler } from "./service/command/update-pet.command";
import { CertifyPetHandler } from "./service/command/certify-pet.command";


const providers : Provider[] = [
    
    // Query
    GetPetHandler,
    GetPetsHandler,
    GetPetsByUserIdsHandler,
    GetPetAttachmentsByPetIdsHandler,
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