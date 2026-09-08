export class AccountUserPhoneVerifiedV1Payload {
    private readonly _userId : string;
    private readonly _phoneNumber : string;

    constructor(userId:string,phoneNumber:string) {
        this._userId = userId;
        this._phoneNumber = phoneNumber;
    }

    get userId() : string {
        return this._userId
    }

    get phoneNumber() : string {
        return this._phoneNumber
    }
}