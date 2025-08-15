import { Injectable } from '@nestjs/common';
import {
    S3Client,
    HeadObjectCommand,
    DeleteObjectCommand,
    GetObjectCommand,
    PutObjectCommand,
    CopyObjectCommand,
  } from '@aws-sdk/client-s3';
  import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class StorageService {
    private s3Client: S3Client;
    constructor(
        private readonly region : string,
        private readonly storageHost : string,
        private readonly bucket : string,
        private readonly accessKeyId : string,
        private readonly secretAccessKey : string,
        private readonly prefix? : string,
    ){
        this.s3Client = new S3Client({
            region: this.region,
            endpoint: this.storageHost,
            credentials: {
              accessKeyId: this.accessKeyId,
              secretAccessKey: this.secretAccessKey,
            },
          });
    }

    async generateUploadPresignedUrl(param: {
        type: 'image' | 'text';
        key: string;
        expires: number;
        meta?: any;
      }): Promise<string> {
        const command = new PutObjectCommand({
          Bucket: this.bucket,
          Key: this.prefix ? `${this.prefix}/${param.key}` : param.key,
          ContentType: param.type === 'image' ? 'image/png' : 'text/plain',
          Metadata: {
            ...param.meta,
          },
        });
        return await getSignedUrl(this.s3Client, command, {
          expiresIn: param.expires,
        });
      }
    
      async generateDownloadPresignedUrl(param: {
        key: string;
        expires: number;
      }): Promise<string> {
        const command = new GetObjectCommand({
          Bucket: this.bucket,
          Key: this.prefix ? `${this.prefix}/${param.key}` : param.key,
        });
        return await getSignedUrl(this.s3Client, command, {
          expiresIn: param.expires,
        });
      }
    
      async getObjectMetadata(param: {
        key: string;
      }): Promise<any> {
        const command = new HeadObjectCommand({
          Bucket: this.bucket,
          Key: this.prefix ? `${this.prefix}/${param.key}` : param.key,
        });
        try {
          const metadata = await this.s3Client.send(command);
          return metadata;
        } catch (err: any) {
          if (err.name === 'NotFound') {
            return undefined;
          }
          throw err;
        }
      }
    
      async deleteObject(param: { key: string }): Promise<void> {
        const command = new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: this.prefix ? `${this.prefix}/${param.key}` : param.key,
        });
        try {
          await this.s3Client.send(command);
        } catch (err: any) {
          if (err.name !== 'NotFound') {
            throw err;
          }
        }
      }
    
      async copyObject(param: {
        sourceKey: string;
        destinationBucket: string;
        destinationKey: string;
      }): Promise<void> {
        const command = new CopyObjectCommand({
          Bucket: param.destinationBucket,
          CopySource: `/${this.bucket}/${this.prefix ? `${this.prefix}/${param.sourceKey}` : param.sourceKey}`,
          Key: this.prefix ? `${this.prefix}/${param.destinationKey}` : param.destinationKey,
        });
    
        try {
          await this.s3Client.send(command);
        } catch (error) {
          throw new Error(`S3 copyObject failed : ${error.message}`);
        }
      }
}