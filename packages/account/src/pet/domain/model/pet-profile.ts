import { PersistenceEntity } from "@core/model";

interface IProfile {
    active : boolean;
    path : string;
}

export class PetProfileEntity extends PersistenceEntity<{ petId : number, no : number },IProfile> {
    
    constructor(param : IProfile) {
        super(param);
    }
    
    static of(param : IProfile) {
        return new PetProfileEntity(param);
    }

    get isActive() {
        return this.etc.active;
    }

    get path() {
        return this.etc.path;
    }
}