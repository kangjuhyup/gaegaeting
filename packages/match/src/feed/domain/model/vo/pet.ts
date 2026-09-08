export class Pet {
    private readonly _id : number;
    private readonly _name: string;
    private readonly _age: number;
    private readonly _gender: string;
    private readonly _breed: string;
    private readonly _size: string;
    private readonly _personalities: string[];
    private readonly _description: string;
    private readonly _profileImages : string[]

    get id() {
        return this._id;
    }

    get name() {
        return this._name;
    }

    get age() {
        return this._age;
    }

    get gender() {
        return this._gender;
    }

    get breed() {
        return this._breed;
    }

    get size() {
        return this._size;
    }

    get personalities() {
        return this._personalities;
    }

    get description() {
        return this._description;
    }

    get profileImages() {
        return this._profileImages;
    }

    constructor(
        id : number,
        name : string,
        age : number,
        gender : string,
        breed : string,
        size : string,
        personalities : string[],
        description : string,
        profileImages : string[]
    ) {
        this._id = id;
        this._name = name;
        this._age = age;
        this._gender = gender;
        this._breed = breed;
        this._size = size;
        this._personalities = personalities;
        this._description = description;
        this._profileImages = profileImages;
    }
}