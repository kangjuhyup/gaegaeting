import { PairEntity } from "@app/pair/domain/model/pair";
import { Command } from "@nestjs/cqrs";

export class SavePairCommand extends Command<PairEntity> {
    constructor(
        public readonly leftUserId : string,
        public readonly rightUserId : string,
        public readonly likeAId : number,
        public readonly likeBId : number,  
    ) {
        super()
    }
}