export class UserRegistered {
    private _profileRegistered : boolean
    private _phoneVerified : boolean
    private _petRegistered : boolean

    constructor(
        profileRegisted : boolean,
        phoneVerified : boolean,
        petRegisted : boolean
    ) {
        this._profileRegistered = profileRegisted
        this._phoneVerified = phoneVerified
        this._petRegistered = petRegisted
    }


    set profileRegistered(profileRegistered : boolean) {
        this._profileRegistered = profileRegistered
    }

    set phoneVerfied(phoneVerivied : boolean) {
        this._phoneVerified = phoneVerivied
    }

    set petRegistered(petRegistered : boolean) {
        this._petRegistered = petRegistered
    }

    get profileRegistered() {
        return this._profileRegistered
    }
    
    get phoneVerfied() {
        return this._phoneVerified
    }

    get petRegistered() {
        return this._petRegistered
    }
}