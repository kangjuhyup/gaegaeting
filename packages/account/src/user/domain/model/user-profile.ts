import { PersistenceEntity } from "@core/model"

interface IProfile {
    path : string;
    active : boolean;
}

interface Pk {
    userId : string,
    no : number
}

export class UserProfileEntity extends PersistenceEntity<Pk,IProfile> {

    private constructor(param : IProfile, pk?: Pk) {
        super(param,pk);
    }

    static of(param : IProfile,pk?:Pk) {
        return new UserProfileEntity(param,pk);
    }

    get path() {
        return this.etc.path;
    }

    get isActive() {
        return this.etc.active;
    }

    set isActive(active : boolean) {
        this.etc.active = active;
    }
}