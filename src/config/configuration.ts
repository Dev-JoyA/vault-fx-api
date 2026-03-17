export default () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '0', 10) || 3000,
  apiPrefix: process.env.API_PREFIX || 'api/v1',
  
  database: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '0', 10) || 5432,
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    ssl: process.env.DB_SSL ?? 'false',
  },
  
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
  },
  
  bcrypt: {
    rounds: parseInt(process.env.BCRYPT_ROUNDS || '0', 10) || 12,
  },
  
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000,http://localhost:3001',
  },
  
  throttle: {
    ttl: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '0', 10) || 900000,
    limit: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '0', 10) || 100,
  },
  
  email: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '0', 10) || 587,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM,
  },
  
  otp: {
    expiryMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES || '0', 10) || 10,
    length: parseInt(process.env.OTP_LENGTH || '0', 10) || 6,
  },
  
  fx: {
    apiUrl: process.env.FX_API_URL,
    apiKey: process.env.FX_API_KEY,
    cacheTtl: parseInt(process.env.FX_CACHE_TTL_SECONDS || '0', 10) || 300,
  },
  
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '0', 10) || 6379,
  },
});