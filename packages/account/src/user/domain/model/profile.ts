import { PersistenceEntity } from "@core/model"

interface IProfile {
    path : string;
    active : boolean;
}

export class ProfileEntity extends PersistenceEntity<{ userId : string, no : number },IProfile> {

    private constructor(param : IProfile) {
        super(param);
    }

    static of(param : IProfile) {
        return new ProfileEntity(param);
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