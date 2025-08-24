import { IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { GetLikeOutQuery } from "../../port/query/get-like-out.query";
import { LikeEntity } from "@app/like/domain/model/like";
import { LikeRepositoryPort } from "@app/like/domain/port/like.repository.port";

@QueryHandler(GetLikeOutQuery)
export class GetLikeOutHandler implements IQueryHandler<GetLikeOutQuery, LikeEntity[]> {
    
    constructor(
        private readonly likeRepository : LikeRepositoryPort
    ) {}
    
    async execute(query: GetLikeOutQuery): Promise<LikeEntity[]> {
        return await this.likeRepository.selectLikeOutFromUserId(query.user.userId)
    }
}
