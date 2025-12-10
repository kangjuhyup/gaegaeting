import { PresignedUrl } from "@app/common/vo/presigned-url";

export abstract class UserStoragePort {

    abstract getPresignedUrl(userId:string, no : number) : Promise<PresignedUrl>

    abstract deleteProfileImage(userId:string, no : number) : Promise<void>

    abstract hasMetadata(userId:string, no : number) : Promise<boolean>
}