import { PresignedUrl } from "@app/user/domain/vo/presigned-url";

export class GetPresignedUrlResponse {
    private url : string;
    private expiresIn : number;

    static from(vo : PresignedUrl) {
        const response = new GetPresignedUrlResponse();
        response.url = vo.url;
        response.expiresIn = vo.expiresIn;
        return response;
    }
}