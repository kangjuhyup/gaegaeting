import * as Joi from 'joi';

// Auth service environment spec
export const envSpec = {
  NODE_ENV: { joi: Joi.string().valid('development', 'production', 'test').default('development') },
  AUTH_SERVICE_API_PORT: { joi: Joi.number().required() },

  // Database
  DATABASE_HOST: { joi: Joi.string().required() },
  DATABASE_PORT: { joi: Joi.number().required() },
  DATABASE_USERNAME: { joi: Joi.string().required() },
  DATABASE_PASSWORD: { joi: Joi.string().required() },
  DATABASE_NAME: { joi: Joi.string().required() },
  DATABASE_LOG: { joi: Joi.boolean().default(true) },
  DATABASE_SYNCHRONIZE: { joi: Joi.boolean().default(false) },

  // JWT (if this service issues tokens)
  JWT_SECRET: { joi: Joi.string().required() },
  JWT_ACCESS_EXPIRATION: { joi: Joi.string().default('1h') },
  JWT_REFRESH_EXPIRATION: { joi: Joi.string().default('30d') },

  // Social providers (optional but recommended to configure)
  KAKAO_CLIENT_ID: { joi: Joi.string().allow('', null) },
  KAKAO_CLIENT_SECRET: { joi: Joi.string().allow('', null) },
  KAKAO_REDIRECT_URI: { joi: Joi.string().allow('', null) },

  APPLE_TEAM_ID: { joi: Joi.string().allow('', null) },
  APPLE_KEY_ID: { joi: Joi.string().allow('', null) },
  APPLE_PRIVATE_KEY: { joi: Joi.string().allow('', null) },
  APPLE_CLIENT_ID: { joi: Joi.string().allow('', null) },

  // Naver Cloud SMS v2
  NAVER_CLOUD_ACCESS_KEY: { joi: Joi.string().required() },
  NAVER_CLOUD_SECRET_KEY: { joi: Joi.string().required() },
  NAVER_CLOUD_SMS_SERVICE_ID: { joi: Joi.string().required() },
  NAVER_CLOUD_SMS_SENDER: { joi: Joi.string().required() },

  // SolApi
  SOLAPI_KEY: { joi: Joi.string().required() },
  SOLAPI_SECRET: { joi: Joi.string().required() },
  SOLAPI_SMS_SENDER: { joi: Joi.string().required() },
} as const;

export type EnvKey = keyof typeof envSpec;
export const ENV_KEY: { [K in EnvKey]: K } = Object.keys(envSpec).reduce(
  (acc, key) => ({ ...acc, [key]: key }),
  {} as any,
);

export const validationSchema = Joi.object(
  Object.fromEntries(Object.entries(envSpec).map(([k, v]) => [k, v.joi]))
);

type EnvSpecToType<T extends Record<string, { joi: Joi.Schema }>> = {
  [K in keyof T]: T[K]['joi'] extends Joi.StringSchema
    ? string
    : T[K]['joi'] extends Joi.NumberSchema
    ? number
    : any;
};
export type EnvironmentVariables = EnvSpecToType<typeof envSpec>;



