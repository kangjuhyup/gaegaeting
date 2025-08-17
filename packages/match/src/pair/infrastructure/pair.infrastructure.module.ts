import { Module, Provider } from "@nestjs/common";
import { PairController } from "./persentation/pair.controller";

const providers : Provider[] = [

]

@Module({
    controllers: [
        PairController
    ]
})
export class PairInfrastructureModule {}