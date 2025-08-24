import { UserPrincipal } from "@core/auth";
import { ApiProperty } from "@nestjs/swagger";

export class GetUserPrincipalResponse {
    
    @ApiProperty({ description : '사용자ID' })
    private readonly userId : string;
    @ApiProperty({ description : '닉네임'})
    private readonly nickname : string;
    @ApiProperty({ description : '생년월일'})
    private readonly birth : string;
    @ApiProperty({ description : '거주지번호'})
    private readonly region : number;


    constructor(
        userId : string,
        nickname : string,
        birth : string,
        region : number,
    ) {
        this.userId = userId;
        this.nickname = nickname;
        this.birth = birth;
        this.region = region;
    }

    static from(
        userPrincipal : UserPrincipal
    ) {
        return new GetUserPrincipalResponse(
            userPrincipal.userId,
            userPrincipal.nickname,
            userPrincipal.birth,
            userPrincipal.region,
        )
    }
}