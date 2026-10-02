import { LocationEntity } from "#app/location/domain/model/location";
import { MainAreaEntity } from "#app/location/domain/model/main-area";
import { PersistenceEntity } from "@core/model";
import { ItemDetail } from "./vo/item-detail.js";
import { FeedItemStatus } from "../enum/feed-item-status.enum.js";

interface IFeedItem {
    targetUserId : string;
    feedId : number;
    state : number;
    showAt? : Date | null;
    actionAt? : Date | null;
    location? : LocationEntity
    mainArea? : MainAreaEntity
}

export class FeedItemEntity extends PersistenceEntity<number,IFeedItem> {

    // 다른 컨텍스트의 모델이기 때문에 PersistenceEntity 와 무관
    private _detail : ItemDetail;

    constructor(param:IFeedItem) {
        super(param)
    }

    static of(param:IFeedItem) {
        return new FeedItemEntity(param)
    }

    set location(location:LocationEntity) {
        this.etc.location = location;
    }

    set mainArea(mainArea:MainAreaEntity) {
        this.etc.mainArea = mainArea;
    }

    set detail(detail : ItemDetail) {
        this._detail = detail;
    }

    get detail() {
        return this._detail;
    }

    get location() {
        return this.etc.location
    }

    get mainArea() {
        return this.etc.mainArea
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

    setDelivery() {
        this.etc.state = FeedItemStatus.DELIVERY.value
    }

    setView() {
        this.etc.state = FeedItemStatus.VIEW.value
    }

    setLike() {
        this.etc.state = FeedItemStatus.LIKE.value
    }

    setPass() {
        this.etc.state = FeedItemStatus.PASS.value
    }

    setReport() {
        this.etc.state = 5
    }

    setExpire() {
        this.etc.state = 6
    }
}