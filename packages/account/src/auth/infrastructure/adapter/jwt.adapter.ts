import { JwtPort } from "@app/auth/domain/port/out/jwt.port";
import { JwtTokenService } from "@core/auth";
import { Injectable } from "@nestjs/common";

@Injectable()
export class JwtAdpater implements JwtPort {
    
    constructor(private readonly jwtTokenService : JwtTokenService){
    }
    createAccessToken(payload: any): Promise<string> {
        return this.jwtTokenService.createAccessToken(payload);
    }
    createRefreshToken(payload: any): Promise<string> {
        return this.jwtTokenService.createRefreshToken(payload);
    }
    
    getExpriesIn(): { accessToken: number; refreshToken: number; } {
        const expires = this.jwtTokenService.getExpriesIn;
        return {
            accessToken : expires.acess,
            refreshToken : expires.refresh
        }
    }
}