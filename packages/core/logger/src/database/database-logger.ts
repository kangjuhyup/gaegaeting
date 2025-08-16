import { Injectable } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import { TypeOrmDatabaseLogger } from './database-logger.interface';

/**
 * Pino를 사용한 데이터베이스 로거 구현
 */
@Injectable()
export class DatabaseLogger implements TypeOrmDatabaseLogger {
  private readonly logger?: any;

  constructor(logger?: any) {
    this.logger = logger;
  }

  /**
   * 쿼리 로깅
   * @param query 실행된 쿼리
   * @param parameters 쿼리 파라미터
   */
  logQuery(query: string, parameters?: any[]): void {
    if (!this.logger) return;
    
    // nestjs-pino의 Logger는 객체를 직접 로깅할 수 있음
    this.logger.debug({
      msg: '쿼리 실행',
      query,
      parameters: parameters || [],
    });
  }

  /**
   * 쿼리 에러 로깅
   * @param error 발생한 에러
   * @param query 실행된 쿼리
   * @param parameters 쿼리 파라미터
   */
  logQueryError(error: string | Error, query: string, parameters?: any[]): void {
    if (!this.logger) return;
    
    const errorMessage = error instanceof Error ? error.message : error;
    const errorStack = error instanceof Error ? error.stack : undefined;

    this.logger.error({
      msg: '쿼리 에러',
      error: errorMessage,
      stack: errorStack,
      query,
      parameters: parameters || [],
    });
  }

  /**
   * 쿼리 실행 시간 로깅
   * @param time 실행 시간
   * @param query 실행된 쿼리
   * @param parameters 쿼리 파라미터
   */
  logQuerySlow(time: number, query: string, parameters?: any[]): void {
    if (!this.logger) return;
    
    this.logger.warn({
      msg: '느린 쿼리',
      time: `${time}ms`,
      query,
      parameters: parameters || [],
    });
  }

  /**
   * 스키마 빌드 로깅
   * @param message 로그 메시지
   */
  logSchemaBuild(message: string): void {
    if (!this.logger) return;
    
    // nestjs-pino에는 log 메서드가 없으므로 info로 대체
    this.logger.info({
      msg: '스키마 빌드',
      details: message,
    });
  }

  /**
   * 마이그레이션 로깅
   * @param message 로그 메시지
   */
  logMigration(message: string): void {
    if (!this.logger) return;
    
    // nestjs-pino에는 log 메서드가 없으므로 info로 대체
    this.logger.info({
      msg: '마이그레이션',
      details: message,
    });
  }

  /**
   * 일반 로깅
   * @param level 로그 레벨
   * @param message 로그 메시지
   */
  log(level: 'log' | 'info' | 'warn' | 'error', message: string): void {
    if (!this.logger) return;
    
    switch (level) {
      case 'log':
      case 'info':
        this.logger.info({ msg: message });
        break;
      case 'warn':
        this.logger.warn({ msg: message });
        break;
      case 'error':
        this.logger.error({ msg: message });
        break;
    }
  }
}
