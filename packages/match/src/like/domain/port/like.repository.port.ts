import { LikeEntity } from "../model/like";

export abstract class LikeRepositoryPort {

    abstract saveLike(like:LikeEntity) : Promise<LikeEntity>

    abstract selectLikeFromId(likeId : number) : Promise<LikeEntity>

    abstract updateLike(like:LikeEntity) : Promise<LikeEntity>

    abstract selectLikeInFromUserId(userId : string) : Promise<LikeEntity[]>

    abstract selectLikeOutFromUserId(userId : string) : Promise<LikeEntity[]>
}