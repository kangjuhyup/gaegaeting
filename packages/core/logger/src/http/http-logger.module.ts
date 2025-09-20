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

  /**
   * HTTP 로깅을 제외할 경로들
   * @default ['/health', '/metrics']
   */
  excludePaths?: string[];
}

/**
 * HTTP 요청/응답 로깅을 위한 모듈
 */
@Module({})
export class HttpLoggerModule {
  /**
   * HTTP 로거 모듈 등록 - 모든 HTTP 요청/응답을 자동으로 로깅합니다
   * 
   * @param options HTTP 로거 모듈 옵션
   * @returns 동적 모듈
   */
  static forRoot(options?: HttpLoggerModuleOptions): DynamicModule {
    const loggerOptions = createPinoLoggerOptions({
      name: options?.name || 'HTTP',
      level: options?.level,
      pretty: options?.pretty,
    });

    // 사용자 지정 제외 경로가 있다면 적용
    if (options?.excludePaths) {
      loggerOptions.exclude = options.excludePaths;
    }

    return {
      module: HttpLoggerModule,
      imports: [
        LoggerModule.forRoot(loggerOptions),
      ],
      exports: [LoggerModule],
    };
  }
}
