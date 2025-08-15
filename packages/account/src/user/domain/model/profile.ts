import { PersistenceEntity } from "@core/model"

export class ProfileEntity extends PersistenceEntity<number,{
    path : string,
    active : boolean
}> {

    private constructor(param : {
        path : string,
        active : boolean
    }) {
        super({path : param.path, active : param.active});
    }

    static of(param : {
        path : string,
        active : boolean
    }) {
        return new ProfileEntity(param);
    }

    get path() {
        return this.path;
    }

    get active() {
        return this.active;
    }
}