import Joi from "joi";

// 1) envSpec만 한 군데서 관리
export const envSpec = {
  NODE_ENV: {
    joi: Joi.string()
      .valid("development", "production", "test")
      .default("development"),
  },
  ACCOUNT_SERVICE_API_PORT: { joi: Joi.number().required() },
  SLACK_WEBHOOK_URL: { joi: Joi.string().uri({ scheme: ['https'] }).allow('').optional() },
  INTERNAL_AUTH_ASSERTION_SECRET: { joi: Joi.string().min(32).required() },
  REGISTRATION_DI_HMAC_SECRET: {
    joi: Joi.string()
      .min(32)
      .when("NODE_ENV", {
        is: "production",
        then: Joi.required(),
        otherwise: Joi.string().default("local-registration-di-hmac-secret"),
      }),
  },
  REGISTRATION_DI_HMAC_KEY_VERSION: {
    joi: Joi.number().integer().min(1).default(1),
  },
  REGISTRATION_HANDOFF_TTL_MS: {
    joi: Joi.number().integer().min(1000).default(600000),
  },
  REGISTRATION_CLAIM_TTL_MS: {
    joi: Joi.number().integer().min(1000).default(300000),
  },
  REGISTRATION_MOCK_ENABLED: {
    joi: Joi.boolean().when("NODE_ENV", {
      is: "production",
      then: Joi.valid(false).default(false),
      otherwise: Joi.boolean().default(true),
    }),
  },
  REGISTRATION_SERVICE_TOKEN: {
    joi: Joi.string()
      .min(32)
      .when("NODE_ENV", {
        is: "production",
        then: Joi.required(),
        otherwise: Joi.string().default("local-registration-service-token"),
      }),
  },
  AUTH_BASE_URL: { joi: Joi.string().uri().required() },
  AUTH_ISSUER: { joi: Joi.string().uri().required() },
  AUTH_PROVISIONING_CLIENT_ID: { joi: Joi.string().required() },
  AUTH_PROVISIONING_CLIENT_SECRET: { joi: Joi.string().min(32).required() },
  AUTH_TENANT_CODE: { joi: Joi.string().required() },
  DATABASE_HOST: { joi: Joi.string().required() },
  DATABASE_PORT: { joi: Joi.number().required() },
  DATABASE_USERNAME: { joi: Joi.string().required() },
  DATABASE_PASSWORD: { joi: Joi.string().required() },
  DATABASE_NAME: { joi: Joi.string().default("ggt_account") },
  PUBLIC_DATA_API_KEY: { joi: Joi.string().required() },
  REDIS_HOST: { joi: Joi.string().required() },
  REDIS_PORT: { joi: Joi.string().required() },

  // user storage (S3 compatible)
  STORAGE_HOST: { joi: Joi.string().required() },
  STORAGE_PET_BUCKET: { joi: Joi.string().required() },
  STORAGE_USER_BUCKET: { joi: Joi.string().required() },
  // separated prefixes
  STORAGE_PROFILE_PREFIX: { joi: Joi.string().required() },
  STORAGE_REGION: { joi: Joi.string().required() },
  STORAGE_ACCESS_KEY_ID: { joi: Joi.string().required() },
  STORAGE_SECRET_ACCESS_KEY: { joi: Joi.string().required() },
} as const;

// 2) 타입과 상수 자동 추출
export type EnvKey = keyof typeof envSpec; // 'PORT' | 'NODE_ENV' | ...
export const ENV_KEY: { [K in EnvKey]: K } = Object.keys(envSpec).reduce(
  (acc, key) => ({ ...acc, [key]: key }),
  {} as any,
);

// 3) Joi 스키마 동적 생성
export const validationSchema = Joi.object(
  Object.fromEntries(Object.entries(envSpec).map(([k, v]) => [k, v.joi])),
);

// 4) 타입 자동 생성
type EnvSpecToType<T extends Record<string, { joi: Joi.Schema }>> = {
  [K in keyof T]: T[K]["joi"] extends Joi.StringSchema
    ? string
    : T[K]["joi"] extends Joi.NumberSchema
      ? number
      : any;
};
export type EnvironmentVariables = EnvSpecToType<typeof envSpec>;
