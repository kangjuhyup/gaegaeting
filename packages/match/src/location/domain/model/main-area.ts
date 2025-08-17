import { PersistenceEntity } from "@core/model";

interface IMainArea {
    code : string;
    name : string;
    parentCode? : string
}

export class MainAreaEntity extends PersistenceEntity<string,IMainArea> {

    constructor(param:IMainArea) {
        super(param)
    }
}