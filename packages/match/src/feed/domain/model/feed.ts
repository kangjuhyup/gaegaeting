import { PersistenceEntity }from '@core/model'
import { FeedItemEntity } from './feed-item';

interface IFeed {
    userId : string;
    date : string;
    slot : number;
    items? : FeedItemEntity[]
}

export class FeedEntity extends PersistenceEntity<number, IFeed> {

    constructor(param:IFeed){
        super(param)
    }

    get userId(){
        return this.etc.userId
    }

    get date(){
        return this.etc.date
    }

    get slot(){
        return this.etc.slot
    }

    get items(){
        return this.etc.items
    }   
}