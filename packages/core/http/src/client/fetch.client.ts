import { Injectable, Optional } from "@nestjs/common";
import { HttpRequestOptions, HttpResponse, HttpError, Logger, ExceptionNotifier } from "./client.opt";

/**
 * Fetch를 이용한 HTTP 클라이언트
 * 
 * 다양한 HTTP 메서드(GET, POST, PUT, DELETE 등)를 지원하며
 * 요청 및 응답에 대한 전처리와 후처리를 담당합니다.
 */
@Injectable()
export class FetchHttpClient {
  private readonly logger?: Logger;
  private readonly exceptionNotifier?: ExceptionNotifier;
  private defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
  private defaultTimeout = 30000; // 30초
  private defaultRetryCount = 3; // 기본 재시도 횟수
  
  /**
   * FetchHttpClient 생성자
   * @param logger 선택적으로 주입받을 로거 (예: Winston, Pino 등)
   * @param exceptionNotifier 예외 발생 시 알림을 보낼 수 있는 알리미 서비스
   */
  constructor(
    @Optional() logger?: Logger,
    @Optional() exceptionNotifier?: ExceptionNotifier
  ) {
    this.logger = logger;
    this.exceptionNotifier = exceptionNotifier;
  }

  /**
   * 기본 헤더 설정
   * @param headers 설정할 헤더 객체
   */
  setDefaultHeaders(headers: Record<string, string>): void {
    this.defaultHeaders = { ...this.defaultHeaders, ...headers };
  }

  /**
   * 기본 타임아웃 설정
   * @param timeout 타임아웃 시간(ms)
   */
  setDefaultTimeout(timeout: number): void {
    this.defaultTimeout = timeout;
  }

  /**
   * 기본 재시도 횟수 설정
   * @param retryCount 재시도 횟수
   */
  setDefaultRetryCount(retryCount: number): void {
    this.defaultRetryCount = retryCount;
  }

  /**
   * GET 요청
   * @param url 요청 URL
   * @param options 요청 옵션
   * @returns 응답 데이터
   */
  async get<T>(url: string, options?: HttpRequestOptions): Promise<HttpResponse<T>> {
    return this.request<T>('GET', url, null, options);
  }

  /**
   * POST 요청
   * @param url 요청 URL
   * @param data 요청 데이터
   * @param options 요청 옵션
   * @returns 응답 데이터
   */
  async post<T>(url: string, data?: any, options?: HttpRequestOptions): Promise<HttpResponse<T>> {
    return this.request<T>('POST', url, data, options);
  }

  /**
   * PUT 요청
   * @param url 요청 URL
   * @param data 요청 데이터
   * @param options 요청 옵션
   * @returns 응답 데이터
   */
  async put<T>(url: string, data?: any, options?: HttpRequestOptions): Promise<HttpResponse<T>> {
    return this.request<T>('PUT', url, data, options);
  }

  /**
   * PATCH 요청
   * @param url 요청 URL
   * @param data 요청 데이터
   * @param options 요청 옵션
   * @returns 응답 데이터
   */
  async patch<T>(url: string, data?: any, options?: HttpRequestOptions): Promise<HttpResponse<T>> {
    return this.request<T>('PATCH', url, data, options);
  }

  /**
   * DELETE 요청
   * @param url 요청 URL
   * @param options 요청 옵션
   * @returns 응답 데이터
   */
  async delete<T>(url: string, options?: HttpRequestOptions): Promise<HttpResponse<T>> {
    return this.request<T>('DELETE', url, null, options);
  }

  /**
   * 공통 HTTP 요청 메서드
   * @param method HTTP 메서드
   * @param url 요청 URL
   * @param data 요청 데이터
   * @param options 요청 옵션
   * @returns 응답 데이터
   */
  private async request<T>(
    method: string,
    url: string,
    data: any = null,
    options: HttpRequestOptions = {},
    currentRetry: number = 0
  ): Promise<HttpResponse<T>> {
    const { headers = {}, timeout = this.defaultTimeout, params, responseType = 'json', retryCount = this.defaultRetryCount } = options;
    
    // URL에 쿼리 파라미터 추가
    const fullUrl = this.appendQueryParams(url, params);
    
    // 요청 옵션 구성
    const requestOptions: RequestInit = {
      method,
      headers: { ...this.defaultHeaders, ...headers },
      ...(data && { body: JSON.stringify(data) }),
    };

    // 타임아웃 설정을 위한 AbortController 생성
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    requestOptions.signal = controller.signal;

    try {
      this.logger?.debug?.(`${method} 요청: ${fullUrl}`);
      if (data) {
        this.logger?.debug?.(`요청 바디: ${JSON.stringify(data)}`);
      }
      const startTime = Date.now();
      
      // fetch 요청 실행
      const response = await fetch(fullUrl, requestOptions);
      
      // 타임아웃 타이머 제거
      clearTimeout(timeoutId);
      
      const endTime = Date.now();
      this.logger?.debug?.(`${method} 응답: ${fullUrl} (${endTime - startTime}ms) - 상태: ${response.status}`);

      // 응답 처리
      const responseData = await this.parseResponse<T>(response, responseType);
      
      // 에러 응답 처리
      if (!response.ok) {
        throw new HttpError(
          `HTTP 에러 ${response.status}: ${response.statusText}`,
          response.status,
          response.statusText,
          responseData
        );
      }

      // 성공 응답 반환
      return {
        data: responseData,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        ok: response.ok,
      };
    } catch (error) {
      clearTimeout(timeoutId);
      
      // 재시도 로직 구현
      if (currentRetry < retryCount) {
        this.logger?.warn?.(`요청 실패, 재시도 중... (${currentRetry + 1}/${retryCount}): ${url}`);
        // 지수 백오프 적용 (선택적): 재시도 간격을 점점 늘림
        const backoffDelay = Math.pow(2, currentRetry) * 300; // 300ms, 600ms, 1200ms, ...
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
        return this.request<T>(method, url, data, options, currentRetry + 1);
      }
      
      // 타임아웃 에러 처리
      if (error.name === 'AbortError') {
        throw new HttpError(
          `요청 타임아웃: ${timeout}ms 초과`,
          408,
          'Request Timeout',
          null
        );
      }
      
      // 이미 HttpError인 경우 그대로 전달
      if (error instanceof HttpError) {
        throw error;
      }
      
      // 기타 에러 처리
      this.logger?.error?.(`HTTP 요청 실패: ${error.message}`, error.stack);
      
      // 예외 알림 서비스가 있는 경우 알림 발송
      const httpError = new HttpError(
        `HTTP 요청 실패: ${error.message}`,
        0,
        'Unknown Error',
        null
      );
      
      this.exceptionNotifier?.notify(httpError, {
        url,
        method,
        data,
        options
      });
      
      throw httpError;
    }
  }

  /**
   * URL에 쿼리 파라미터 추가
   * @param url 기본 URL
   * @param params 쿼리 파라미터
   * @returns 쿼리 파라미터가 추가된 URL
   */
  private appendQueryParams(url: string, params?: Record<string, string | number | boolean>): string {
    if (!params || Object.keys(params).length === 0) {
      return url;
    }

    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      searchParams.append(key, String(value));
    });

    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}${searchParams.toString()}`;
  }

  /**
   * 응답 데이터 파싱
   * @param response fetch 응답 객체
   * @param responseType 응답 타입
   * @returns 파싱된 응답 데이터
   */
  private async parseResponse<T>(
    response: Response,
    responseType: 'json' | 'text' | 'blob' | 'arraybuffer'
  ): Promise<T> {
    switch (responseType) {
      case 'json':
        // 빈 응답인 경우 빈 객체 반환
        const text = await response.text();
        return text ? JSON.parse(text) : {} as T;
      case 'text':
        return await response.text() as unknown as T;
      case 'blob':
        return await response.blob() as unknown as T;
      case 'arraybuffer':
        return await response.arrayBuffer() as unknown as T;
      default:
        return await response.json();
    }
  }
}