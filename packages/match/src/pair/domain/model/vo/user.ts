export class User {
    private readonly _userId : string;
    private readonly _nickname : string;
    private readonly _profile : string;

    constructor(
        userId : string,
        nickname : string,
        profile : string,
    ) {
        this._userId = userId;
        this._nickname = nickname;
        this._profile = profile;
    }

    static of(
        userId : string,
        nickname : string,
        profile : string,
    ) : User {
        return new User(userId, nickname, profile)
    }

    get userId() : string {
        return this._userId
    }

    get nickname() : string {
        return this._nickname
    }

    get profile() : string {
        return this._profile
    }
}