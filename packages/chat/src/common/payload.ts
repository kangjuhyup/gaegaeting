export class MatchFeedLikeV1Payload {
    private readonly _likerId : string;
    private readonly _likeeId : string;
    private readonly _feedItemId : number;

    constructor(likerId : string, likeeId : string, feedItemId : number) {
        this._likerId = likerId;
        this._likeeId = likeeId;
        this._feedItemId = feedItemId;
    }

    get likerId() : string {
        return this._likerId;
    }

    get likeeId() : string {
        return this._likeeId;
    }

    get feedItemId() : number {
        return this._feedItemId;
    }
}

export class NotificationFcmSendV1Payload {
    private readonly _type : string;
    private readonly _userId : string;
    private readonly _likeId : number;

    constructor(type : string, userId : string, likeId : number) {
        this._type = type;
        this._userId = userId;
        this._likeId = likeId;
    }

    get type() : string {
        return this._type;
    }

    get userId() : string {
        return this._userId;
    }

    get likeId() : number {
        return this._likeId;
    }
}
    
export class MatchPairCreatedV1Payload {
    private readonly _leftUserId : string;
    private readonly _rightUserId : string;
    private readonly _likeAId : number;
    private readonly _likeBId : number;

    constructor(leftUserId : string, rightUserId : string, likeAId : number, likeBId : number) {
        this._leftUserId = leftUserId;
        this._rightUserId = rightUserId;
        this._likeAId = likeAId;
        this._likeBId = likeBId;
    }

    get leftUserId() : string {
        return this._leftUserId;
    }

    get rightUserId() : string {
        return this._rightUserId;
    }

    get likeAId() : number {
        return this._likeAId;
    }

    get likeBId() : number {
        return this._likeBId;
    }
}

export class ChatRoomCreatedV1Payload {
    private readonly _leftUserId : string;
    private readonly _rightUserId : string;
    private readonly _pairId : number;

    constructor(leftUserId : string, rightUserId : string, pairId : number) {
        this._leftUserId = leftUserId;
        this._rightUserId = rightUserId;
        this._pairId = pairId;
    }

    get leftUserId() : string {
        return this._leftUserId;
    }

    get rightUserId() : string {
        return this._rightUserId;
    }

    get pairId() : number {
        return this._pairId;
    }
}