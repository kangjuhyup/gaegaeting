export interface TypeOrmDatabaseLogger {
  /**
   * 쿼리 로깅
   * @param query 실행된 쿼리
   * @param parameters 쿼리 파라미터
   */
  logQuery(query: string, parameters?: any[]): void;

  /**
   * 쿼리 에러 로깅
   * @param error 발생한 에러
   * @param query 실행된 쿼리
   * @param parameters 쿼리 파라미터
   */
  logQueryError(error: string | Error, query: string, parameters?: any[]): void;

  /**
   * 쿼리 실행 시간 로깅
   * @param time 실행 시간
   * @param query 실행된 쿼리
   * @param parameters 쿼리 파라미터
   */
  logQuerySlow(time: number, query: string, parameters?: any[]): void;

  /**
   * 스키마 빌드 로깅
   * @param message 로그 메시지
   */
  logSchemaBuild(message: string): void;

  /**
   * 마이그레이션 로깅
   * @param message 로그 메시지
   */
  logMigration(message: string): void;

  /**
   * 일반 로깅
   * @param level 로그 레벨
   * @param message 로그 메시지
   */
  log(level: 'log' | 'info' | 'warn' | 'error', message: string): void;
}
