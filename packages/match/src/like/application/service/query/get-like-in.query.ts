import { IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { GetLikeInQuery } from "../../port/query/get-like-in.query";
import { LikeEntity } from "@app/like/domain/model/like";
import { LikeRepositoryPort } from "@app/like/domain/port/like.repository.port";

@QueryHandler(GetLikeInQuery)
export class GetLikeInHandler implements IQueryHandler<GetLikeInQuery, LikeEntity[]> {
    
    constructor(
        private readonly likeRepository : LikeRepositoryPort
    ) {}
    
    async execute(query: GetLikeInQuery): Promise<LikeEntity[]> {
        return await this.likeRepository.selectLikeInFromUserId(query.user.userId)
    }
}
