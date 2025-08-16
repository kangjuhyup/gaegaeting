export class PresignedUrl {
    private _url : string
    private _expiresIn : number
    private _path : string

    static from(
        url: { presignedUrl: string; path: string },
        expiresIn : number
    ) {
        const presigned = new PresignedUrl();
        presigned._url = url.presignedUrl;
        presigned._path = url.path;
        presigned._expiresIn = expiresIn;
        return presigned;
    }

    get url() {
        return this._url;
    }

    get expiresIn() {
        return this._expiresIn;
    }
    
    get path() {
        return this._path;
    }
}