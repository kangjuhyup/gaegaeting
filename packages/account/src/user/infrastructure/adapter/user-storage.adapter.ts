import { UserStoragePort } from "@app/user/domain/port/out/user-storage.port";
import { PresignedUrl } from "@app/user/domain/vo/presigned-url";
import { StorageService } from "@core/storage";
import { Injectable } from "@nestjs/common";

@Injectable()
export class UserStorageAdapter implements UserStoragePort {
    constructor(
        private readonly storageService : StorageService
    ) {}
    async getPresignedUrl(userId: string, no : number): Promise<PresignedUrl> {
        const url = await this.storageService.generateUploadPresignedUrl({
            type : 'image',
            key : `${userId}-${no}`,
            expires : 3600
        });
        return PresignedUrl.from(url, 3600);
    }

}