import { PresignedUrl } from "@app/common/vo/presigned-url";

export abstract class PetStoragePort {
    abstract getPresignedUrl(petId:number, no : number) : Promise<PresignedUrl>
    
    abstract deletePetImage(petId:number, no : number) : Promise<void>
    
    abstract hasMetadata(petId:number, no : number) : Promise<boolean>
}