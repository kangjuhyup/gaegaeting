import { AuthEntity } from "@app/auth/domain/model/auth"

export class LoginResponse {
    accessToken : string
    expiresIn : number
    refreshToken : string
    refreshTokenExpiresIn : number
    
    static from(auth:AuthEntity) {
        const res = new LoginResponse();
        res.accessToken = auth.getAuthToken().getAccessToken();
        res.expiresIn = auth.getAuthToken().getExpiresIn();
        res.refreshToken = auth.getAuthToken().getRefreshToken();
        res.refreshTokenExpiresIn = auth.getAuthToken().getRefreshTokenExpiresIn();
        return res;
    }
}