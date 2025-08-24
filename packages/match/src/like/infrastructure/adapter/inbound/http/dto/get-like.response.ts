import { LikeEntity } from "@app/like/domain/model/like";
import { ApiProperty } from "@nestjs/swagger";

class LikeResponse {
    @ApiProperty({ description : 'Like ID', example : 1})
    id : number
    @ApiProperty({ description : 'Like를 한 사람 ID', example : '1234567890'})
    likerId : string;
    @ApiProperty({ description : 'Like를 받은 사람 ID', example : '1234567890'})
    likeeId : string;
    @ApiProperty({ description : 'Like 경로', example : 'feed'})
    source : number;
    @ApiProperty({ description : 'Like 생성 시간', example : '2025-08-24T11:50:22.000Z'})
    likedAt : Date;

    static from(like:LikeEntity) : LikeResponse {
        const response = new LikeResponse()
        response.id = like.id
        response.likerId = like.likerId
        response.likeeId = like.likeeId
        response.source = like.source
        response.likedAt = like.createdAt
        return response
    }
}

export class GetLikeResponse {
    @ApiProperty({ description : 'Like 목록', type : () => LikeResponse, isArray : true})
    likes : LikeResponse[]

    static of(likes : LikeEntity[]) : GetLikeResponse {
        const response = new GetLikeResponse()
        response.likes = likes.map(LikeResponse.from)
        return response
    }
}