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
            forcePathStyle: true,
            // The browser supplies the body after signing; do not sign an empty-body CRC32.
            requestChecksumCalculation: 'WHEN_REQUIRED',
            credentials: {
              accessKeyId: this.accessKeyId,
              secretAccessKey: this.secretAccessKey,
            },
          });
    }

    /** Buffer one bounded object version; review validation and storage use these same bytes. */
    async readImageSnapshot(key: string, maxBytes: number): Promise<Uint8Array> {
      if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) throw new Error('INVALID_PROFILE_IMAGE');
      const storageKey = this.prefix ? `${this.prefix}/${key}` : key;
      const head = await this.s3Client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: storageKey }));
      if (!head.ETag || !Number.isSafeInteger(head.ContentLength) || head.ContentLength < 1 ||
          head.ContentLength > maxBytes || head.ContentType !== 'image/png') throw new Error('INVALID_PROFILE_IMAGE');
      const object = await this.s3Client.send(new GetObjectCommand({
        Bucket: this.bucket, Key: storageKey, IfMatch: head.ETag,
      }));
      const body = object.Body as AsyncIterable<Uint8Array> & { destroy?: () => void };
      try {
        // Check the response too: some S3-compatible providers ignore conditional requests.
        if (!body || !body[Symbol.asyncIterator] || object.ETag !== head.ETag ||
            object.ContentType !== 'image/png' || object.ContentLength !== head.ContentLength) {
          throw new Error('INVALID_PROFILE_IMAGE');
        }
        const chunks: Buffer[] = [];
        let length = 0;
        for await (const chunk of body) {
          length += chunk.byteLength;
          if (length > maxBytes || length > head.ContentLength) throw new Error('INVALID_PROFILE_IMAGE');
          chunks.push(Buffer.from(chunk));
        }
        if (length !== head.ContentLength) throw new Error('INVALID_PROFILE_IMAGE');
        return Buffer.concat(chunks, length);
      } finally {
        body?.destroy?.();
      }
    }

    async writeImageSnapshot(destinationKey: string, bytes: Uint8Array): Promise<void> {
      await this.s3Client.send(new PutObjectCommand({
        Bucket: this.bucket, Key: this.prefix ? `${this.prefix}/${destinationKey}` : destinationKey,
        Body: bytes, ContentType: 'image/png', CacheControl: 'private, max-age=300',
      }));
    }

    async generateUploadPresignedUrl(param: {
        type: 'image' | 'text';
        key: string;
        expires: number;
        meta?: any;
      }): Promise<{ presignedUrl: string; path: string }> {
        const key = this.prefix ? `${this.prefix}/${param.key}` : param.key;
        const command = new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          ContentType: param.type === 'image' ? 'image/png' : 'text/plain',
          Metadata: {
            ...param.meta,
          },
        });
        const presignedUrl = await getSignedUrl(this.s3Client, command, {
          expiresIn: param.expires,
        });
        
        return {
          presignedUrl,
          path: `${this.storageHost}/${this.bucket}/${key}`
        };
      }
    
      async generateDownloadPresignedUrl(param: {
        key: string;
        expires: number;
      }): Promise<{ presignedUrl: string; path: string }> {
        const key = this.prefix ? `${this.prefix}/${param.key}` : param.key;
        const command = new GetObjectCommand({
          Bucket: this.bucket,
          Key: key,
        });
        const presignedUrl = await getSignedUrl(this.s3Client, command, {
          expiresIn: param.expires,
        });
        
        return {
          presignedUrl,
          path: `${this.storageHost}/${this.bucket}/${key}`
        };
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
