import { Global, Module } from '@nestjs/common';
import { ChatPostgresConnection } from './postgres-connection.js';
@Global()
@Module({ providers: [ChatPostgresConnection], exports: [ChatPostgresConnection] })
export class ChatPostgresModule {}
