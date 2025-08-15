import { PresignedUrl } from "@app/user/domain/vo/presigned-url";
import { ApiProperty } from "@nestjs/swagger";

export class GetPresignedUrlResponse {
    @ApiProperty({ description: '사진 업로드 URL' })
    private url : string;
    
    @ApiProperty({ description: 'URL 만료 시간(초)' })
    private expiresIn : number;

    static from(vo : PresignedUrl) {
        const response = new GetPresignedUrlResponse();
        response.url = vo.url;
        response.expiresIn = vo.expiresIn;
        return response;
    }
}