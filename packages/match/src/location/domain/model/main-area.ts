import { PersistenceEntity } from "@core/model";

interface IMainArea {
    code : string;
    name : string;
    parentCode? : string
}

export class MainAreaEntity extends PersistenceEntity<string,IMainArea> {

    constructor(param:IMainArea,userId?:string) {
        super(param,userId)
    }

    get code() {
        return this.etc.code;
    }

    get name() {
        return this.etc.name;
    }

    get parentCode() {
        return this.etc.parentCode;
    }

    static of(param : IMainArea) : MainAreaEntity {
        return new MainAreaEntity(param);
    }
}