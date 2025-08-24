import { IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { GetPairsQuery } from "../../port/query/get-pairs.port";
import { PairEntity } from "@app/pair/domain/model/pair";
import { PairRepositoryPort } from "@app/pair/domain/port/pair.repository.port";
import { UserApiPort } from "@app/pair/domain/port/user-api.port";
import { PetApiPort } from "@app/pair/domain/port/pet-api.port";
import { Target } from "@app/pair/domain/model/vo/target";

@QueryHandler(GetPairsQuery)
export class GetPairsHandler implements IQueryHandler<GetPairsQuery, PairEntity[]> {
    constructor(
        private readonly pairRepository : PairRepositoryPort,
        private readonly userApi : UserApiPort,
        private readonly petApi : PetApiPort,
    ) {}

    async execute(query : GetPairsQuery) : Promise<PairEntity[]> {
        const pairs = await this.pairRepository.selectPairsFromUser(query.user.userId);
        await Promise.all(pairs.map(async (pair) => {
            const targetUserId = query.user.userId === pair.leftUserId ? pair.leftUserId : pair.rightUserId
            const user = await this.userApi.getUser(targetUserId)
            const pets = await this.petApi.getPetsFromUser(targetUserId)
            pair.target = Target.of(user,pets)
        }));
        return pairs;
    }
}