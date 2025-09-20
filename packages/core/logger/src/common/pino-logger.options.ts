import { LoggerModule } from 'nestjs-pino';
import { Params } from 'nestjs-pino/params';
import { DynamicModule } from '@nestjs/common';

/**
 * Pino 로거 옵션 생성 함수
 * 
 * @param options 로거 옵션
 * @returns Pino 로거 모듈 옵션
 */
export const createPinoLoggerOptions = (
  options?: {
    name?: string;
    level?: string;
    pretty?: boolean;
  },
): any => {
  const name = options?.name || 'App';
  const level = options?.level || 'info';
  const pretty = options?.pretty ?? (process.env.NODE_ENV !== 'production');

  const pinoHttp: any = {
    name,
    level,
    formatters: {
      level: (label) => {
        return { level: label };
      },
    },
  };

  // pretty 모드일 때만 transport 설정
  if (pretty) {
    try {
      pinoHttp.transport = {
        target: 'pino-pretty',
        options: {
          colorize: true,
          levelFirst: true,
          translateTime: 'yyyy-mm-dd HH:MM:ss',
        },
      };
    } catch (error) {
      // pino-pretty가 설치되지 않은 경우 일반 JSON 로그로 fallback
      console.warn('pino-pretty not available, falling back to JSON logging');
    }
  }

  return {
    pinoHttp,
    exclude: ['/health', '/metrics'],
  };
};
