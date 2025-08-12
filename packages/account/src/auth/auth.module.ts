import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { validationSchema } from './config/env.config';
import { CqrsModule } from '@nestjs/cqrs';
import { AuthInfraStructureModule } from './infrastructure/infrastructure.module';
import { AuthApplicationModule } from './application/application.module';

@Module({
  imports: [ 
    // AuthInfraStructureModule,
    AuthApplicationModule,
  ],
})
export class AuthModule {}
