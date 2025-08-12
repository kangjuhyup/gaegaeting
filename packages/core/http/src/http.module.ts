import { DynamicModule, Module, Provider } from "@nestjs/common";
import { FetchHttpClient } from "./client/fetch.client";
import { Logger, ExceptionNotifier } from "./client/client.opt";

/**
 * HTTP 모듈 기본 옵션 인터페이스
 */
export interface HttpModuleOptions {
  /** 타임아웃 시간 (ms) */
  timeout?: number;
  /** 재시도 횟수 */
  retryCount?: number;
  /** 로거 (예: Winston, Pino 등) */
  logger?: Logger;
  /** 예외 알림 서비스 */
  exceptionNotifier?: ExceptionNotifier;
}

/**
 * HTTP 클라이언트 모듈
 * 각 서비스별로 고유한 HTTP 클라이언트 인스턴스를 제공합니다.
 */
@Module({})
export class HttpModule {

    /**
     * 기본 HTTP 모듈 설정
     * @param options HTTP 클라이언트 옵션
     * @returns 동적 모듈 설정
     */
    static forRoot(options?: HttpModuleOptions): DynamicModule {
        const timeout = options?.timeout ?? 5000; // 기본값 5초
        const retryCount = options?.retryCount ?? 3; // 기본값 3회
        const logger = options?.logger; // 선택적 로거
        const exceptionNotifier = options?.exceptionNotifier; // 예외 알림 서비스
        
        // 기본 로거와 예외 알림 서비스를 전역 객체로 저장
        const globalOptions = {
            logger,
            exceptionNotifier,
            timeout,
            retryCount
        };
        
        const httpClientProvider: Provider = {
            provide: FetchHttpClient,
            useFactory: () => {
                const client = new FetchHttpClient(logger, exceptionNotifier);
                client.setDefaultTimeout(timeout);
                client.setDefaultRetryCount(retryCount);
                return client;
            }
        };
        
        // 기본 옵션 제공자
        const optionsProvider: Provider = {
            provide: 'HTTP_MODULE_OPTIONS',
            useValue: globalOptions
        };
        
        return {
            module: HttpModule,
            providers: [httpClientProvider, optionsProvider],
            exports: [FetchHttpClient, 'HTTP_MODULE_OPTIONS'],
            global: false // 전역 모듈이 아닌 개별 모듈로 설정
        };
    }
    
    /**
     * 특정 서비스를 위한 HTTP 클라이언트 모듈 설정
     * @param serviceName 서비스 이름 (예: 'kakao', 'naver')
     * @param options HTTP 클라이언트 옵션 (타임아웃, 재시도 횟수, 로거, 예외 알림 서비스)
     * @returns 동적 모듈 설정
     */
    static forService(serviceName: string, options?: HttpModuleOptions): DynamicModule {
        // 서비스별 고유 프로바이더 토큰 생성
        const serviceToken = `HTTP_CLIENT_${serviceName.toUpperCase()}`;
        
        const httpClientProvider: Provider = {
            provide: serviceToken,
            useFactory: (globalOptions: HttpModuleOptions) => {
                // 기본 옵션과 서비스별 옵션 병합
                const timeout = options?.timeout ?? globalOptions.timeout ?? 5000;
                const retryCount = options?.retryCount ?? globalOptions.retryCount ?? 3;
                const logger = options?.logger ?? globalOptions.logger;
                const exceptionNotifier = options?.exceptionNotifier ?? globalOptions.exceptionNotifier;
                
                const client = new FetchHttpClient(logger, exceptionNotifier);
                client.setDefaultTimeout(timeout);
                client.setDefaultRetryCount(retryCount);
                return client;
            },
            inject: ['HTTP_MODULE_OPTIONS']
        };
        
        return {
            module: HttpModule,
            imports: [HttpModule.forRoot()], // 기본 옵션을 가져오기 위해 forRoot 사용
            providers: [httpClientProvider],
            exports: [httpClientProvider],
            global: false
        };
    }
}