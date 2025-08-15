import { DynamicModule, Global, Module, Provider, Type } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DatabaseSchema, getEntitiesBySchema } from "./datasource";

/**
 * 데이터베이스 모듈 비동기 구성 옵션 인터페이스
 */
export interface DatabaseModuleAsyncOptions {
  imports?: any[];
  useFactory?: (...args: any[]) => any;
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
   * 정적 구성으로 데이터베이스 모듈을 초기화합니다.
   * @param schema 데이터베이스 스키마 배열
   * @returns 동적 모듈 구성
   */
  static forRoot(schema: DatabaseSchema[]): DynamicModule {
    if (schema.length === 0) {
      throw new Error("데이터베이스 스키마를 입력해주세요.");
    }

    // 스키마에 따라 엔티티 매핑
    const entities = getEntitiesBySchema(schema);

    return {
      module: DatabaseModule,
      imports: [
        TypeOrmModule.forRoot({
          type: "mysql",
          host: "localhost",
          port: 3306,
          username: "root",
          password: "password",
          database: "gaegaeting",
          entities: entities,
          synchronize: true, // 개발 환경에서만 사용
        }),
        TypeOrmModule.forFeature(entities),
      ],
      providers: [],
      exports: [TypeOrmModule],
    };
  }

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
      throw new Error("데이터베이스 스키마를 입력해주세요.");
    }

    // 스키마에 따라 엔티티 매핑
    const entities = getEntitiesBySchema(schema);

    return {
      module: DatabaseModule,
      imports: [
        ...(options.imports || []),
        TypeOrmModule.forRootAsync({
          imports: [ConfigModule],
          useFactory: (configService: ConfigService) => ({
            type: "mysql",
            host: configService.get<string>("DATABASE_HOST"),
            port: configService.get<number>("DATABASE_PORT"),
            username: configService.get<string>("DATABASE_USERNAME"),
            password: configService.get<string>(
              "DATABASE_PASSWORD",
            ),
            database: configService.get<string>("DATABASE_NAME"),
            entities: entities,
            synchronize: configService.get<boolean>(
              "DATABASE_SYNCHRONIZE",
              false,
            ),
          }),
          inject: [ConfigService],
        }),
        TypeOrmModule.forFeature(entities),
      ],
      providers: [
        ...this.createAsyncProviders(options),
        // 여기에 데이터베이스 관련 서비스 제공자를 추가합니다
      ],
      exports: [TypeOrmModule],
    };
  }

  /**
   * 비동기 옵션에 따라 필요한 제공자를 생성합니다.
   * @param options 데이터베이스 모듈 비동기 구성 옵션
   * @returns 제공자 배열
   */
  private static createAsyncProviders(
    options: DatabaseModuleAsyncOptions,
  ): Provider[] {
    if (options.useFactory) {
      return [
        {
          provide: "DATABASE_OPTIONS",
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
      ];
    }

    // useClass 또는 useExisting 경우 처리
    return [];
  }
}
