import { PersistenceEntity }from '@core/model'

interface ILike {

}

export class LikeEntity extends PersistenceEntity<number,ILike> {

    constructor(param:ILike) {
        super(param)
    }
}