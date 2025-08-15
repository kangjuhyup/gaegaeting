import { Module } from '@nestjs/common';
import { AuthApplicationModule } from './application/application.module';

@Module({
  imports: [ 
    // AuthInfraStructureModule,
    AuthApplicationModule,
  ],
})
export class AuthModule {}
