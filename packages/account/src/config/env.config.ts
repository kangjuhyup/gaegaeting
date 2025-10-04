import * as Joi from 'joi';

// 1) envSpec만 한 군데서 관리
export const envSpec = {
  NODE_ENV: { joi: Joi.string().valid('development', 'production', 'test').default('development') },
  PORT: { joi: Joi.number().default(3000) },
  JWT_SECRET: { joi: Joi.string().required() },
  JWT_ACCESS_EXPIRATION: { joi: Joi.string().default('1h') },
  JWT_REFRESH_EXPIRATION: { joi: Joi.string().default('30d') },
  KAKAO_CLIENT_ID: { joi: Joi.string().required() },
  KAKAO_CLIENT_SECRET: { joi: Joi.string().required() },
  KAKAO_API_KEY : { joi : Joi.string().required() },
  NAVER_CLIENT_ID: { joi: Joi.string().required() },
  NAVER_CLIENT_SECRET: { joi: Joi.string().allow('', null) },
  GOOGLE_CLIENT_ID: { joi: Joi.string().required() },
  GOOGLE_CLIENT_SECRET: { joi: Joi.string().allow('', null) },
  DATABASE_HOST: { joi: Joi.string().required() },
  DATABASE_PORT: { joi: Joi.number().required() },
  DATABASE_USERNAME: { joi: Joi.string().required() },
  DATABASE_PASSWORD: { joi: Joi.string().required() },
  DATABASE_NAME: { joi: Joi.string().default('ggt_account') },
  PUBLIC_DATA_API_KEY: { joi: Joi.string().required() },
  REDIS_HOST : { joi: Joi.string().required() },
  REDIS_PORT : { joi: Joi.string().required() }
} as const;

// 2) 타입과 상수 자동 추출
export type EnvKey = keyof typeof envSpec; // 'PORT' | 'NODE_ENV' | ...
export const ENV_KEY: { [K in EnvKey]: K } = Object.keys(envSpec).reduce(
  (acc, key) => ({ ...acc, [key]: key }),
  {} as any,
);

// 3) Joi 스키마 동적 생성
export const validationSchema = Joi.object(
  Object.fromEntries(Object.entries(envSpec).map(([k, v]) => [k, v.joi]))
);

// 4) 타입 자동 생성
type EnvSpecToType<T extends Record<string, { joi: Joi.Schema }>> = {
  [K in keyof T]:
    T[K]['joi'] extends Joi.StringSchema ? string
    : T[K]['joi'] extends Joi.NumberSchema ? number
    : any;
};
export type EnvironmentVariables = EnvSpecToType<typeof envSpec>;
