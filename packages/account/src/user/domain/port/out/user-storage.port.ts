import { PresignedUrl } from "../../vo/presigned-url";

export abstract class UserStoragePort {

    abstract getPresignedUrl(userId:string, no : number) : Promise<PresignedUrl>
}