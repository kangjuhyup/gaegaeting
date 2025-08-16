import { Module, Provider } from "@nestjs/common";
import { PetInfraStructureModule } from "../infrastructure/infrastructure.module";
import { GetPetHandler } from "./service/query/get-pet.query";
import { GetPetsHandler } from "./service/query/get-pets.query";
import { RegisterPetHandler } from "./service/command/register-pet.command";
import { GeneratePetPresignedUrlHandler } from "./service/command/generate-pet-presigned.command";
import { UpdatePetHandler } from "./service/command/update-pet.command";


const providers : Provider[] = [
    
    // Query
    GetPetHandler,
    GetPetsHandler,
    // Command
    RegisterPetHandler,
    UpdatePetHandler,
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