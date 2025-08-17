import { Module, Provider } from "@nestjs/common";
import { LikeController } from "./persentation/like.controller";

const providers : Provider[] = []

@Module({
    controllers: [
        LikeController
    ]
})
export class LikeInfrastructureModule{}