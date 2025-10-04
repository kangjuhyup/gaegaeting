export class VerifyResult {

    private readonly success : boolean
    private readonly remainingAttempts : number

    constructor(
        success : boolean,
        remainingAttempts : number
    ) {
        this.success = success
        this.remainingAttempts = remainingAttempts
    }

    static success() : VerifyResult {
        return new VerifyResult(true,0)
    }    

    static fail(remainingAttempts : number) {
        return new VerifyResult(false,remainingAttempts)
    }
}