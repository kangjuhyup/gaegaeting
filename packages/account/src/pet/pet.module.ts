import { Module } from "@nestjs/common";
import { join } from "path";
import { PetApplicationModule } from "./application/application.module";
import { PetInfraStructureModule } from "./infrastructure/infrastructure.module";
import { PetResolver } from "./infrastructure/adapter/inbound/gql/pet.resolver";
import { UserProfileByIdLoader } from "./infrastructure/adapter/inbound/gql/dataloader/user-profile-by-id.loader";
import { PetAttachmentsByPetIdLoader } from "./infrastructure/adapter/inbound/gql/dataloader/pet-attachments-by-pet-id.loader";

// GraphQL 스키마 파일 경로
// 개발 환경: __dirname은 src/pet를 가리킴
// 프로덕션 환경: __dirname은 dist/src/pet를 가리킴 (nest-cli.json의 assets 설정으로 .graphql 파일이 복사됨)
export const PET_GRAPHQL_SCHEMA_PATH = join(__dirname, 'infrastructure/adapter/inbound/gql/**/*.graphql');
// GraphQL 타입 정의 파일 경로 (스키마와 같은 경로)
export const PET_GRAPHQL_DEFINITIONS_PATH = join(process.cwd(), './src/pet/infrastructure/adapter/inbound/gql/graphql.ts');

@Module({
    imports : [
        PetApplicationModule,
        PetInfraStructureModule,
    ],
    providers: [
        PetResolver,
        UserProfileByIdLoader,
        PetAttachmentsByPetIdLoader,
    ],
})
export class PetModule {}