import { Module } from "@nestjs/common";
import { join } from "path";
import { fileURLToPath } from "node:url";
import { PetApplicationModule } from "./application/application.module.js";
import { PetInfraStructureModule } from "./infrastructure/infrastructure.module.js";
import { PetResolver } from "./infrastructure/adapter/inbound/gql/pet.resolver.js";

const currentDirectory = fileURLToPath(new URL('.', import.meta.url));

// GraphQL 스키마 파일 경로
// 개발 환경: __dirname은 src/pet를 가리킴
// 프로덕션 환경: __dirname은 dist/src/pet를 가리킴 (nest-cli.json의 assets 설정으로 .graphql 파일이 복사됨)
export const PET_GRAPHQL_SCHEMA_PATH = join(currentDirectory, 'infrastructure/adapter/inbound/gql/**/*.graphql');
// GraphQL 타입 정의 파일 경로 (스키마와 같은 경로)
export const PET_GRAPHQL_DEFINITIONS_PATH = join(process.cwd(), './src/pet/infrastructure/adapter/inbound/gql/graphql.ts');

@Module({
    imports : [
        PetApplicationModule,
        PetInfraStructureModule,
    ],
    providers: [
        PetResolver,
    ],
})
export class PetModule {}
