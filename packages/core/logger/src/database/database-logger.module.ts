import { DynamicModule, Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { createPinoLoggerOptions } from '../common/pino-logger.options';
import { DatabaseLogger } from './database-logger';

export interface DatabaseLoggerModuleOptions {
  name?: string;
  level?: string;
  pretty?: boolean;
}
@Module({})
export class DatabaseLoggerModule {
  /**
   * 데이터베이스 로거 모듈 등록
   * 
   * @param options 데이터베이스 로거 모듈 옵션
   * @returns 동적 모듈
   */
  static forRoot(options?: DatabaseLoggerModuleOptions): DynamicModule {
    return {
      module: DatabaseLoggerModule,
      imports: [
        LoggerModule.forRoot(
          createPinoLoggerOptions({
            name: options?.name || 'Database',
            level: options?.level,
            pretty: options?.pretty,
          }),
        ),
      ],
      providers: [
        {
          provide: DatabaseLogger,
          useFactory: (logger) => new DatabaseLogger(logger),
          inject: ['LOGGER'],
        },
      ],
      exports: [LoggerModule, DatabaseLogger],
    };
  }
}
