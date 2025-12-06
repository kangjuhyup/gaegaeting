import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { GraphQLModule } from "@nestjs/graphql";
import { ApolloDriver, ApolloDriverConfig } from "@nestjs/apollo";
import { JwtModule } from "@nestjs/jwt";
import { join } from "path";
import { ENV_KEY, validationSchema } from "./common/config/env.config";
import { DatabaseModule, DatabaseSchema } from '@core/database';
import { AdapterModule } from './adapter/adpater.module';

// GraphQL 스키마 파일 경로 결정 (개발/프로덕션 환경 모두 지원)
const getGraphQLSchemaPath = () => {
  // __dirname은 빌드 후 dist/src를 가리킴
  const isDist = __dirname.includes('dist');
  if (isDist) {
    // dist/src -> src로 변환
    return join(__dirname.replace('dist/src', 'src'), 'adapter/in/gql/**/*.graphql');
  }
  // 개발 환경에서는 __dirname이 src를 가리킴
  return join(__dirname, 'adapter/in/gql/**/*.graphql');
};

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: validationSchema,
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      typePaths: [getGraphQLSchemaPath()],
      definitions: {
        path: join(process.cwd(), './src/adapter/in/gql/graphql.ts'),
      },
      playground: true,
      introspection: true,
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>(ENV_KEY.JWT_SECRET);
        const expiresIn = configService.get<string>(ENV_KEY.JWT_ACCESS_EXPIRATION) || '1h';
        return {
          secret,
          signOptions: {
            expiresIn: expiresIn as any,
          },
        };
      },
    }),
    DatabaseModule.forRootAsync(
      {
          imports : [
              ConfigModule
          ],
          inject : [ConfigService]
      },
      [DatabaseSchema.AUTH],
    ),
    AdapterModule,
  ],
})
export class AppModule {}