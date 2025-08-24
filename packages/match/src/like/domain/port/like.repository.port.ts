import { LikeEntity } from "../model/like";

export abstract class LikeRepositoryPort {

    abstract saveLike(like:LikeEntity) : Promise<LikeEntity>
}