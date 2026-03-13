import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  MONGODB_URI: Joi.string().uri().required(),
  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  ACCESS_TOKEN_TTL: Joi.string()
    .pattern(/^\d+[smhd]$/)
    .default('15m'),
  REFRESH_TOKEN_TTL: Joi.string()
    .pattern(/^\d+[smhd]$/)
    .default('7d'),
  REFRESH_COOKIE_NAME: Joi.string().default('refreshToken'),
  BCRYPT_SALT_ROUNDS: Joi.number().integer().min(10).default(10),
});
