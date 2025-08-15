import { DynamicModule, Module, Provider, Type } from "@nestjs/common";
import { StorageService } from "./service/storage.service";


export const STORAGE_MODULE_OPTIONS = 'STORAGE_MODULE_OPTIONS';
interface StorageModuleOptions {
    storageHost : string
    bucket : string
    prefix? : string
    region : string
    accessKeyId : string
    secretAccessKey : string
}

export interface StorageModuleAsyncOptions {
    imports?: any[];
    useFactory?: (...args: any[]) => Promise<StorageModuleOptions> | StorageModuleOptions;
    useClass?: Type<any>;
    useExisting?: Type<any>;
    inject?: any[];
}


@Module({})
export class StorageModule {
    /**
     * 정적 설정으로 모듈 초기화
     * @param options 인증 모듈 옵션을 직접 전달
     * @returns 동적 모듈 설정
     */
    static forRoot(options: StorageModuleOptions): DynamicModule {
        return {
            module: StorageModule,
            imports: [
            ],
            providers: [
                {
                    provide: STORAGE_MODULE_OPTIONS,
                    useValue: options,
                },
                {
                    provide: StorageService,
                    useFactory: (storageOptions: StorageModuleOptions) => {
                        return new StorageService(storageOptions.region, storageOptions.storageHost, storageOptions.bucket, storageOptions.prefix, storageOptions.accessKeyId, storageOptions.secretAccessKey);
                    },
                    inject: [STORAGE_MODULE_OPTIONS]
                },
            ],
            exports: [
                StorageService,
            ],
        };
    }

    /**
     * 비동기 설정으로 모듈 초기화
     * @param options 비동기 인증 모듈 옵션
     * @returns 동적 모듈 설정
     */
    static forRootAsync(
        options: StorageModuleAsyncOptions
    ): DynamicModule {
        const asyncProviders = this.createAsyncProviders(options);
        
        return {
            module: StorageModule,
            imports: [
                ...(options.imports || []),
            ],
            providers: [
                ...asyncProviders,
                {
                    provide: StorageService,
                    useFactory: async (storageOptions: StorageModuleOptions) => {
                        return new StorageService(storageOptions.region, storageOptions.storageHost, storageOptions.bucket, storageOptions.prefix, storageOptions.accessKeyId, storageOptions.secretAccessKey);
                    },
                    inject: [STORAGE_MODULE_OPTIONS]
                },
            ],
            exports: [
                StorageService,
            ],
        };
    }

    /**
     * 비동기 프로바이더 생성
     * @param options 비동기 인증 모듈 옵션
     * @returns 프로바이더 배열
     */
    private static createAsyncProviders(options: StorageModuleAsyncOptions): Provider[] {
        if (options.useFactory || options.useExisting || options.useClass) {
            return [
                {
                    provide: STORAGE_MODULE_OPTIONS,
                    useFactory: options.useFactory,
                    inject: options.inject || [],
                },
            ];
        }
        return [];
    }
}
              