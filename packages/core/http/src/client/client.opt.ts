/**
 * HTTP 요청 옵션 인터페이스
 */
export interface HttpRequestOptions {
  headers?: Record<string, string>;
  timeout?: number;
  params?: Record<string, string | number | boolean>;
  responseType?: 'json' | 'text' | 'blob' | 'arraybuffer';
  retryCount?: number;
}

/**
 * 로거 인터페이스
 * NestJS LoggerService와 호환되는 인터페이스
 */
export interface Logger {
  debug?(message: any, ...optionalParams: any[]): void;
  log?(message: any, ...optionalParams: any[]): void;
  warn?(message: any, ...optionalParams: any[]): void;
  error?(message: any, ...optionalParams: any[]): void;
}

/**
 * 예외 알림 인터페이스
 * 예외 발생 시 알림을 보낼 수 있는 인터페이스
 */
export interface ExceptionNotifier {
  notify(error: Error, context?: Record<string, any>): void;
}

/**
 * HTTP 응답 인터페이스
 */
export interface HttpResponse<T> {
  data: T;
  status: number;
  statusText: string;
  headers: Headers;
  ok: boolean;
}

/**
 * HTTP 에러 클래스
 */
export class HttpError extends Error {
  constructor(
    message: string,
    public status: number,
    public statusText: string,
    public data?: any
  ) {
    super(message);
    this.name = 'HttpError';
  }
}
