import Joi from 'joi';
export const validationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  CHAT_SERVICE_API_PORT: Joi.number().integer().min(1).max(65535).default(2804),
  INTERNAL_AUTH_ASSERTION_SECRET: Joi.string().min(32).required(),
  DATABASE_HOST: Joi.string().required(), DATABASE_PORT: Joi.number().default(5432),
  DATABASE_USERNAME: Joi.string().required(), DATABASE_PASSWORD: Joi.string().required(),
  DATABASE_NAME: Joi.string().default('ggt_chat'), DATABASE_LOG: Joi.boolean().default(false),
  MATCH_SERVICE_HOST: Joi.string().uri({ scheme: ['http', 'https'] }).required(),
  CHAT_KAFKA_ENABLED: Joi.boolean().default(true),
  CHAT_KAFKA_GROUP_ID: Joi.string().default('gaegaeting-chat-v1'),
  KAFKA_TOPIC_PREFIX: Joi.string().pattern(/^[A-Za-z0-9][A-Za-z0-9._-]*$/).max(200).allow('').default(''),
  KAFKA_BROKERS: Joi.alternatives().try(Joi.array().items(Joi.string()).min(1),
    Joi.string().custom(value => value.split(',').map((item: string) => item.trim()).filter(Boolean)))
    .when('CHAT_KAFKA_ENABLED', { is: true, then: Joi.required() }),
});
