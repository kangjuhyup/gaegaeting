import { AuthEntity } from "@app/auth/domain/model/auth"
import { ApiProperty } from "@nestjs/swagger"

export class LoginResponse {
    @ApiProperty({ description: '액세스 토큰' })
    private readonly accessToken : string
    
    @ApiProperty({ description: '액세스 토큰 만료 시간(초)' })
    private readonly expiresIn : number
    
    @ApiProperty({ description: '리프레시 토큰' })
    private readonly refreshToken : string
    
    @ApiProperty({ description: '리프레시 토큰 만료 시간(초)' })
    private readonly refreshTokenExpiresIn : number

    constructor(
        accessToken : string,
        expiresIn : number,
        refreshToken : string,
        refreshTokenExpiresIn : number
    ) {
        this.accessToken = accessToken;
        this.expiresIn = expiresIn;
        this.refreshToken = refreshToken;
        this.refreshTokenExpiresIn = refreshTokenExpiresIn;
    }
    
    static from(auth:AuthEntity) {
        const res = new LoginResponse(
            auth.getAuthToken().getAccessToken(),
            auth.getAuthToken().getExpiresIn(),
            auth.getAuthToken().getRefreshToken(),
            auth.getAuthToken().getRefreshTokenExpiresIn()
        );
        return res;
    }
}