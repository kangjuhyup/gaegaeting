export abstract class JwtPort {
    
    abstract createAccessToken(payload : any) : Promise<string>;
    abstract createRefreshToken(payload : any) : Promise<string>;
    abstract getExpriesIn() : {accessToken : number, refreshToken : number};
}