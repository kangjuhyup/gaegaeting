export class Pet {
    private readonly _petId : number;
    private readonly _petName : string;
    private readonly _petProfile : string;

    constructor(
        petId : number,
        petName : string,
        petProfile : string,
    ) {
        this._petId = petId;
        this._petName = petName;
        this._petProfile = petProfile;
    }

    static of(
        petId : number,
        petName : string,
        petProfile : string,
    ) : Pet {
        return new Pet(petId, petName, petProfile)
    }

    get petId() : number {
        return this._petId
    }

    get petName() : string {
        return this._petName
    }

    get petProfile() : string {
        return this._petProfile
    }
}