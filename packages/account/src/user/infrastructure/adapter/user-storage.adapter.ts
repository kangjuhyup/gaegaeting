import { UserStoragePort } from "@app/user/domain/port/out/user-storage.port";
import { PresignedUrl } from "@app/common/vo/presigned-url";
import { StorageService } from "@core/storage";
import { Injectable } from "@nestjs/common";

@Injectable()
export class UserStorageAdapter implements UserStoragePort {
    constructor(
        private readonly storageService : StorageService
    ) {}
    async getPresignedUrl(userId: string, no : number): Promise<PresignedUrl> {
        const result = await this.storageService.generateUploadPresignedUrl({
            type : 'image',
            key : `${userId}-${no}`,
            expires : 3600
        });
        return PresignedUrl.from(result, 3600);
    }

    async deleteProfileImage(userId: string, no : number): Promise<void> {
        await this.storageService.deleteObject({
            key : `${userId}-${no}`
        });
    }

    async hasMetadata(userId: string, no : number): Promise<boolean> {
        const metadata = await this.storageService.getObjectMetadata({
            key : `${userId}-${no}`
        });

        // 메타데이터 존재할 경우 True 없을 경우 False
        return metadata !== undefined;
    }
}