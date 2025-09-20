import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { RedisPubSubModule} from '@core/redis';
import { HttpLoggerModule } from '@core/logger';

@Module({
    imports : [
        // 환경변수
        ConfigModule.forRoot({
            isGlobal: true,
        }),
        // HTTP 로깅
        HttpLoggerModule.forRoot({
            name: 'Chat-API',
            level: process.env.LOG_LEVEL || 'info',
        }),
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