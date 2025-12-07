import * as Joi from 'joi';

// Gateway service environment spec
export const envSpec = {
  NODE_ENV: {
    joi: Joi.string()
      .valid('development', 'production', 'test')
      .default('development'),
  },
  GATEWAY_PORT: { joi: Joi.number().default(4000) },

  // Subgraph service URLs
  AUTH_SERVICE_URL: {
    joi: Joi.string().uri().allow('', null),
  },
  ACCOUNT_SERVICE_URL: {
    joi: Joi.string().uri().allow('', null),
  },
  MATCH_SERVICE_URL: {
    joi: Joi.string().uri().allow('', null),
  },
  CHAT_SERVICE_URL: {
    joi: Joi.string().uri().allow('', null),
  },
} as const;

export type EnvKey = keyof typeof envSpec;

export const ENV_KEY: { [K in EnvKey]: K } = Object.keys(envSpec).reduce(
  (acc, key) => ({ ...acc, [key]: key }),
  {} as any,
);

export const validationSchema = Joi.object(
  Object.fromEntries(Object.entries(envSpec).map(([k, v]) => [k, v.joi])),
);

type EnvSpecToType<T extends Record<string, { joi: Joi.Schema }>> = {
  [K in keyof T]: T[K]['joi'] extends Joi.StringSchema
    ? string
    : T[K]['joi'] extends Joi.NumberSchema
    ? number
    : any;
};

export type EnvironmentVariables = EnvSpecToType<typeof envSpec>;

