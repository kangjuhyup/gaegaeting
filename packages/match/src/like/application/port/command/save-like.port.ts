import { LikeEntity } from "@app/like/domain/model/like";
import { Command } from "@nestjs/cqrs";

export class SaveLikeCommand extends Command<LikeEntity> {

    constructor(
        public readonly likerId : string,
        public readonly likeeId : string,
        public readonly source : number
    ) {
        super();
    }
}