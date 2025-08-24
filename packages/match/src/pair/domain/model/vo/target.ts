import { Pet } from "./pet";
import { User } from "./user";

export class Target {
    private readonly _user : User;

    private readonly _pets : Pet[];

    constructor(
        user : User,
        pets : Pet[]
    ) {
        this._user = user;
        this._pets = pets;
    }

    static of(
        user : User,
        pets : Pet[]
    ) : Target {
        return new Target(user, pets)
    }

    get user() : User {
        return this._user
    }

    get pets() : Pet[] {
        return this._pets
    }
}