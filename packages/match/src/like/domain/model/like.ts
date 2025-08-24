import { PersistenceEntity }from '@core/model'

interface ILike {
    likerId: string;
    likeeId: string;
    source: number;
    active: boolean;
}

export class LikeEntity extends PersistenceEntity<number,ILike> {

    constructor(param:ILike) {
        super(param)
    }

    static of(param:ILike) {
        return new LikeEntity(param);
    }

    get likerId() {
        return this.etc.likerId
    }

    get likeeId() {
        return this.etc.likeeId
    }

    get source() {
        return this.etc.source
    }

    get active() {
        return this.etc.active
    }
}