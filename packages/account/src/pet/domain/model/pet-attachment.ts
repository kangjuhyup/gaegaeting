import { PersistenceEntity } from "@core/model";

interface IProfile {
    active : boolean;
    path : string;
}

export class PetAttachemntEntity extends PersistenceEntity<{ petId : number, no : number },IProfile> {
    
    constructor(param : IProfile) {
        super(param);
    }
    
    static of(param : IProfile) {
        return new PetAttachemntEntity(param);
    }

    get petId() {
        return this.id.petId;
    }

    get no() {
        return this.id.no;
    }

    get isActive() {
        return this.etc.active;
    }

    get path() {
        return this.etc.path;
    }
}