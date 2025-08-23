import { Pet } from "./pet";
import { User } from "./user";

export class ItemDetail {
    private readonly _user : User;
    private readonly _pets : Pet[] = []

    get user() {
        return this._user;
    }

    get pets() {
        return this._pets;
    }

    constructor(
        user : User,
        pets : Pet[]
    ) {
        this._user = user;
        this._pets = pets;
    }
}