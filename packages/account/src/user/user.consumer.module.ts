import { Module } from "@nestjs/common";
import { ClientsModule, Transport } from "@nestjs/microservices";
import { UserConsumer } from "./user.consumer";

@Module({
    imports : [
        ClientsModule.register([
            {
                name : 'ACCOUNT_USER',
                transport : Transport.KAFKA,
                options : {
                    client : {
                        clientId : 'account_user',
                        brokers : [process.env.KAFKA_BROKERS!]
                    },
                    consumer : {
                        groupId : 'account_user_consumer'
                    }
                }
            }
        ]),
    ],
    providers: [UserConsumer],
    exports: [UserConsumer]
})
export class UserConsumerModule {}