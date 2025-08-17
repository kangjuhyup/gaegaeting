import { PersistenceEntity } from "@core/model";

interface IPair {

}

export class PairEntity extends PersistenceEntity<number,IPair> {

    constructor(param:IPair) {
        super(param)
    }
}