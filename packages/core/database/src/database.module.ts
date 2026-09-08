import { MikroOrmModule } from '@mikro-orm/nestjs';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { type DynamicModule, Global, Module, type Type } from '@nestjs/common';
import type { DatabaseConfigReader } from './database-options.js';
import type { DatabaseSchema } from './database-schema.js';
import { getMikroEntitiesBySchema } from './mikro/datasource/database-schema.js';
import { buildMikroPostgresOptions } from './mikro/mikro-database-options.js';
import { MikroOrmTransactionAdapter } from './mikro/transaction/mikro-transaction.adapter.js';
import { DEFAULT_TRANSACTION_BOUNDARY } from './transaction/transaction.tokens.js';
import {
  defaultTransactionOwnershipContext,
  TransactionOwnershipContext,
} from './transaction/transaction-ownership-context.js';

/**
 * 데이터베이스 모듈 비동기 구성 옵션 인터페이스
 */
export interface DatabaseModuleAsyncOptions {
  imports?: any[];
  useFactory?: (...args: any[]) => DatabaseConfigReader | Promise<DatabaseConfigReader>;
  useClass?: Type<any>;
  useExisting?: Type<any>;
  inject?: any[];
}

/**
 * 데이터베이스 모듈
 *
 * 데이터베이스 연결 및 관련 서비스를 제공하는 모듈입니다.
 */
@Global()
@Module({})
export class DatabaseModule {
  /**
   * 비동기 구성으로 데이터베이스 모듈을 초기화합니다.
   * ConfigService를 주입받아 환경 변수를 통해 데이터베이스 연결을 구성합니다.
   * @param options 데이터베이스 모듈 비동기 구성 옵션
   * @param schema 데이터베이스 스키마 배열
   * @returns 동적 모듈 구성
   */
  static forRootAsync(
    options: DatabaseModuleAsyncOptions,
    schema: DatabaseSchema[],
  ): DynamicModule {
    if (schema.length === 0) {
      throw new Error('At least one database schema is required');
    }

    const entities = getMikroEntitiesBySchema(schema);
    const mikroModule = MikroOrmModule.forRootAsync({
      driver: PostgreSqlDriver,
      imports: options.imports,
      inject: options.inject ?? [],
      useFactory: async (...dependencies: any[]) => ({
        ...buildMikroPostgresOptions(
          await (options.useFactory
            ? options.useFactory(...dependencies)
            : dependencies[0]),
          entities,
        ),
        registerRequestContext: true,
      }),
    });

    return {
      module: DatabaseModule,
      imports: [mikroModule],
      providers: [
        {
          provide: TransactionOwnershipContext,
          useValue: defaultTransactionOwnershipContext,
        },
        MikroOrmTransactionAdapter,
        {
          provide: DEFAULT_TRANSACTION_BOUNDARY,
          useExisting: MikroOrmTransactionAdapter,
        },
      ],
      exports: [DEFAULT_TRANSACTION_BOUNDARY],
    };
  }
}
