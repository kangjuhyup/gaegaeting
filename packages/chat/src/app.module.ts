import { Module } from "@nestjs/common";
import { RedisPubSubModule} from '@core/redis';

@Module({
    imports : [
        RedisPubSubModule.forRootAsync({
            useFactory : () => {
                return {
                    client : {
                        mode: 'single',
                        options: {
                            url : 'redis://localhost:6379'
                        }
                    }
                }
            }
        })
    ]
})
export class AppModule {}