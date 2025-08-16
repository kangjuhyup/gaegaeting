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
  const pretty = options?.pretty ?? process.env.NODE_ENV !== 'production';

  const pinoHttp: any = {
    name,
    level,
    transport: pretty
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            levelFirst: true,
            translateTime: 'yyyy-mm-dd HH:MM:ss',
          },
        }
      : undefined,
    formatters: {
      level: (label) => {
        return { level: label };
      },
    },
  };

  return {
    pinoHttp,
    exclude: ['/health', '/metrics'],
  };
};
