import { PersistenceEntity } from "@core/model";
import { YYYYMMDD } from "@core/util";
import { Target } from "./vo/target";

interface IPair {
    leftUserId: string;
    rightUserId: string;
    active: boolean;
    unmatchedAt?: Date | null;
    likeAId?: number | null;
    likeBId?: number | null;
}

export class PairEntity extends PersistenceEntity<number,IPair> {

    private _target? : Target;

    constructor(param:IPair) {
        super(param)
    }

    static of(param:IPair) : PairEntity {
        return new PairEntity(param)
    }

    get leftUserId() : string {
        return this.etc.leftUserId
    }

    get rightUserId() : string {
        return this.etc.rightUserId
    }

    get active() : boolean {
        return this.etc.active
    }

    get unmatchedAt() : Date | null {
        return this.etc.unmatchedAt
    }

    get likeAId() : number | null {
        return this.etc.likeAId
    }

    get likeBId() : number | null {
        return this.etc.likeBId
    }

    cancel() : void {
        this.etc.active = false;
        this.etc.unmatchedAt = YYYYMMDD.today().toDate();
    }

    set target(target : Target) {
        this._target = target;
    }

    get target() : Target | undefined {
        return this._target;
    }
}