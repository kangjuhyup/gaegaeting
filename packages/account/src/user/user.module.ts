import { Module } from "@nestjs/common";
import { join } from "path";
import { UserApplicationModule } from "./application/application.module";
import { UserInfraStructureModule } from "./infrastructure/infrastructure.module";
import { UserResolver } from "./infrastructure/adapter/inbound/gql/user.resolver";

// GraphQL 스키마 파일 경로
// 개발 환경: __dirname은 src/user를 가리킴
// 프로덕션 환경: __dirname은 dist/src/user를 가리킴 (nest-cli.json의 assets 설정으로 .graphql 파일이 복사됨)
export const USER_GRAPHQL_SCHEMA_PATH = join(__dirname, 'infrastructure/adapter/inbound/gql/**/*.graphql');
// GraphQL 타입 정의 파일 경로 (스키마와 같은 경로)
export const USER_GRAPHQL_DEFINITIONS_PATH = join(process.cwd(), './src/user/infrastructure/adapter/inbound/gql/graphql.ts');

@Module({
    imports : [
        UserApplicationModule,
        UserInfraStructureModule,
    ],
    providers: [
        UserResolver,
    ],
})
export class UserModule {}