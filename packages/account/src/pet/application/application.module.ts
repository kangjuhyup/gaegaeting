import { Module, Provider } from "@nestjs/common";
import { PetInfraStructureModule } from "../infrastructure/infrastructure.module";
import { GetPetHandler } from "./service/query/get-pet.query";
import { GetPetsHandler } from "./service/query/get-pets.query";
import { RegisterPetHandler } from "./service/command/register-pet.command";


const providers : Provider[] = [
    
    // Query
    GetPetHandler,
    GetPetsHandler,
    // Command
    RegisterPetHandler,
]

@Module({
    imports: [
        PetInfraStructureModule,
    ],
    providers : providers,
    exports : providers,
})
export class PetApplicationModule {}