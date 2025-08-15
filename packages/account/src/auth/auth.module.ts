import { Module } from '@nestjs/common';
import { AuthApplicationModule } from './application/application.module';
import { CqrsModule } from '@nestjs/cqrs';

@Module({
  imports: [ 
    CqrsModule,
    AuthApplicationModule,
  ],
})
export class AuthModule {}
