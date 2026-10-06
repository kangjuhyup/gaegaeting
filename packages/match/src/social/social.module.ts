import { Module } from "@nestjs/common";
import { LikeInfrastructureModule } from "../like/infrastructure/like.infrastructure.module.js";
import { PairInfrastructureModule } from "../pair/infrastructure/pair.infrastructure.module.js";
import { SocialResolver } from "./social.resolver.js";
@Module({
  imports: [LikeInfrastructureModule, PairInfrastructureModule],
  providers: [SocialResolver],
})
export class SocialModule {}
