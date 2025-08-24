import { PairEntity } from "@app/pair/domain/model/pair";
import { Query } from "@nestjs/cqrs";
import { UserPrincipal } from "@core/auth";

export class GetPairsQuery extends Query<PairEntity[]> {

    constructor(
        public readonly user : UserPrincipal
    ) {
        super();
    }
}