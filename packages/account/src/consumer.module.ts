import { Module } from "@nestjs/common";
import { UserConsumerModule } from "./user/user.consumer.module";

@Module({
    imports : [
        UserConsumerModule
    ],
})
export class ConsumerModule {}