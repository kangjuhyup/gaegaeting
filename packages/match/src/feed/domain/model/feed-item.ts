import { PersistenceEntity } from "@core/model";

interface IFeedItem {
    targetUserId : string;
    feedId : number;
    state : number;
    showAt? : Date | null;
    actionAt? : Date | null;
    expiresAt? : Date | null;
}

export class FeedItemEntity extends PersistenceEntity<number,IFeedItem> {

    constructor(param:IFeedItem) {
        super(param)
    }

    static of(param:IFeedItem) {
        return new FeedItemEntity(param)
    }

    get targetUserId() {
        return this.etc.targetUserId
    }

    get feedId() {
        return this.etc.feedId
    }

    get state() {
        return this.etc.state
    }

    get showAt() {
        return this.etc.showAt
    }

    get actionAt() {
        return this.etc.actionAt
    }

    get expiresAt() {
        return this.etc.expiresAt
    }

    setDelivery() {
        this.etc.state = 1
    }

    setView() {
        this.etc.state = 2
    }

    setLike() {
        this.etc.state = 3
    }

    setPass() {
        this.etc.state = 4
    }

    setReport() {
        this.etc.state = 5
    }

    setExpire() {
        this.etc.state = 6
    }
}