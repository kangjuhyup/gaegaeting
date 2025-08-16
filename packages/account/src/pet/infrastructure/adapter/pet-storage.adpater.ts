import { Injectable } from "@nestjs/common";
import { PetStoragePort } from "@app/pet/domain/port/out/pet-storage.port";
import { PresignedUrl } from "@app/common/vo/presigned-url";
import { StorageService } from "@core/storage";

@Injectable()
export class PetStorageAdpater implements PetStoragePort {
    
    constructor(
        private readonly storageService : StorageService
    ) {}
    
    async getPresignedUrl(petId:number, no : number) : Promise<PresignedUrl> {
        const result = await this.storageService.generateUploadPresignedUrl({
            type : 'image',
            key : `${petId}-${no}`,
            expires : 3600
        });
        return PresignedUrl.from(result, 3600);
    }

    async deletePetImage(petId:number, no : number) : Promise<void> {
        await this.storageService.deleteObject({
            key : `${petId}-${no}`
        });
    }

    async hasMetadata(petId:number, no : number) : Promise<boolean> {
        const metadata = await this.storageService.getObjectMetadata({
            key : `${petId}-${no}`
        });
        return metadata !== null;
    }
}
