import { PairEntity } from "../model/pair";

export abstract class PairRepositoryPort {

    abstract savePair(pair:PairEntity) : Promise<PairEntity>
    abstract selectPairsFromUser(userId : string) : Promise<PairEntity[]>

    abstract selectPairFromId(id : number) : Promise<PairEntity>

    abstract updatePair(pair : PairEntity) : Promise<void>
}