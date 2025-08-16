import { Module, Provider } from "@nestjs/common";
import { RegisterPetCommand } from "./port/in/command/register-pet.port";
import { PetInfraStructureModule } from "../infrastructure/infrastructure.module";


const providers : Provider[] = [
    
    // Query

    // Command
    RegisterPetCommand,
]

@Module({
    imports: [
        PetInfraStructureModule,
    ],
    providers : providers,
    exports : providers,
})
export class PetApplicationModule {}