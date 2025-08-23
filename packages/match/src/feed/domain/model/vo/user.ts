export class User {
    private readonly _id : string;
    private readonly _nickname : string;
    private readonly _profile : string;

    get id() {
        return this._id;
    }

    get nickname() {
        return this._nickname;
    }

    get profile() {
        return this._profile;
    }

    constructor(
        id : string,
        nickname : string,
        profile : string,
    ) {
        this._id = id;
        this._nickname = nickname;
        this._profile = profile;
    }
}