import { DynamicModule, Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { createPinoLoggerOptions } from '../common/pino-logger.options';

/**
 * HTTP 로거 모듈 옵션 인터페이스
 */
export interface HttpLoggerModuleOptions {
  /**
   * 로거 이름
   */
  name?: string;
  
  /**
   * 로그 레벨
   */
  level?: string;
  
  /**
   * 개발 환경에서 로그를 예쁘게 출력할지 여부
   */
  pretty?: boolean;
}

/**
 * HTTP 요청/응답 로깅을 위한 모듈
 */
@Module({})
export class HttpLoggerModule {
  /**
   * HTTP 로거 모듈 등록
   * 
   * @param options HTTP 로거 모듈 옵션
   * @returns 동적 모듈
   */
  static forRoot(options?: HttpLoggerModuleOptions): DynamicModule {
    return {
      module: HttpLoggerModule,
      imports: [
        LoggerModule.forRoot(
          createPinoLoggerOptions({
            name: options?.name || 'HTTP',
            level: options?.level,
            pretty: options?.pretty,
          }),
        ),
      ],
      exports: [LoggerModule],
    };
  }
}
