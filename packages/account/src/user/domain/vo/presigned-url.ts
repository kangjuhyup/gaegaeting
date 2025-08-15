export class PresignedUrl {
    private _url : string
    private _expiresIn : number

    static from(
        url: string,
        expiresIn : number
    ) {
        const presigned =  new PresignedUrl();
        presigned._url = url
        presigned._expiresIn = expiresIn
        return presigned;
    }

    get url() {
        return this._url;
    }

    get expiresIn() {
        return this._expiresIn;
    }
}