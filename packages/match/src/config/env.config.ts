import * as Joi from 'joi';

function parseKafkaBrokers(input: string): string[] {
  const raw = String(input ?? '').trim();
  if (!raw) return [];

  // Accept: "['kafka:9092']" or '["kafka:9092"]'
  if (raw.startsWith('[') && raw.endsWith(']')) {
    const inner = raw.slice(1, -1).trim();
    if (!inner) return [];
    return inner
      .split(',')
      .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
      .filter(Boolean);
  }

  // Accept: "kafka:9092, kafka2:9092"
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

// 1) envSpec만 한 군데서 관리
export const envSpec = {
  NODE_ENV: { joi: Joi.string().valid('development', 'production', 'test').default('development') },
  MATCH_SERVICE_API_PORT: { joi: Joi.number().required() },
  JWT_SECRET: { joi: Joi.string().required() },
  JWT_ACCESS_EXPIRATION: { joi: Joi.string().default('1h') },
  JWT_REFRESH_EXPIRATION: { joi: Joi.string().default('30d') },
  DATABASE_HOST: { joi: Joi.string().required() },
  DATABASE_PORT: { joi: Joi.number().required() },
  DATABASE_USERNAME: { joi: Joi.string().required() },
  DATABASE_PASSWORD: { joi: Joi.string().required() },
  DATABASE_NAME: { joi: Joi.string().default('ggt_match') },
  ACCOUNT_SERVICE_HOST : { joi : Joi.string().required().default('http://localhost:3000') },
  KAFKA_BROKERS : {
    joi : Joi.alternatives()
      .try(
        Joi.array().items(Joi.string().required()).min(1),
        Joi.string().required().custom((value) => {
          const parsed = parseKafkaBrokers(value);
          if (parsed.length === 0) throw new Error('KAFKA_BROKERS must not be empty');
          return parsed;
        }),
      )
      .required(),
  },
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
