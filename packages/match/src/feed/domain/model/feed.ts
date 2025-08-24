import { PersistenceEntity }from '@core/model'
import { FeedItemEntity } from './feed-item';
import { YYYYMMDD } from '@core/util';

interface IFeed {
    userId : string;
    date : YYYYMMDD;
    slot : number;
    expiresAt : Date;
    items? : FeedItemEntity[]
}

export class FeedEntity extends PersistenceEntity<number, IFeed> {

    constructor(param:IFeed){
        super(param)
    }

    static of(param : IFeed) {
        return new FeedEntity(param);
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

    get expiresAt(){
        return this.etc.expiresAt
    }

    get items(){
        return this.etc.items
    }   
}