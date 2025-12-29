/**
 * Configuration Management for NexusProseCreator-Audiobook
 */

import { config as dotenvConfig } from 'dotenv';

// Load environment variables
dotenvConfig();

function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (value === undefined && defaultValue === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value || defaultValue!;
}

function getEnvNumber(key: string, defaultValue: number): number {
  const value = process.env[key];
  return value ? parseInt(value, 10) : defaultValue;
}

function getEnvBoolean(key: string, defaultValue: boolean): boolean {
  const value = process.env[key];
  return value ? value.toLowerCase() === 'true' : defaultValue;
}

export const config = {
  server: {
    env: getEnv('NODE_ENV', 'production'),
    port: getEnvNumber('PORT', 9101),
    wsPort: getEnvNumber('WS_PORT', 9102),
    serviceName: getEnv('SERVICE_NAME', 'nexus-prosecreator-audiobook')
  },

  database: {
    postgres: {
      host: getEnv('POSTGRES_HOST', 'localhost'),
      port: getEnvNumber('POSTGRES_PORT', 5432),
      database: getEnv('POSTGRES_DATABASE', 'nexus'),
      user: getEnv('POSTGRES_USER', 'nexus'),
      password: getEnv('POSTGRES_PASSWORD'),
      max: getEnvNumber('POSTGRES_MAX_CONNECTIONS', 20),
      idleTimeoutMillis: getEnvNumber('POSTGRES_IDLE_TIMEOUT', 30000),
      connectionTimeoutMillis: getEnvNumber('POSTGRES_CONNECTION_TIMEOUT', 10000)
    }
  },

  tts: {
    elevenlabs: {
      apiKey: getEnv('ELEVENLABS_API_KEY', ''),
      modelId: getEnv('ELEVENLABS_MODEL_ID', 'eleven_multilingual_v2'),
      baseUrl: getEnv('ELEVENLABS_BASE_URL', 'https://api.elevenlabs.io/v1'),
      costPer1K: getEnvNumber('ELEVENLABS_COST_PER_1K', 0.30)
    },
    xtts: {
      baseUrl: getEnv('XTTS_BASE_URL', 'http://nexus-xtts:8000'),
      enabled: getEnvBoolean('XTTS_ENABLED', true),
      costPer1K: getEnvNumber('XTTS_COST_PER_1K', 0.00)
    },
    playht: {
      apiKey: getEnv('PLAYHT_API_KEY', ''),
      userId: getEnv('PLAYHT_USER_ID', ''),
      baseUrl: getEnv('PLAYHT_BASE_URL', 'https://api.play.ht/api/v2'),
      costPer1K: getEnvNumber('PLAYHT_COST_PER_1K', 0.20)
    }
  },

  audio: {
    tempDir: getEnv('AUDIO_TEMP_DIR', '/app/temp'),
    outputDir: getEnv('AUDIO_OUTPUT_DIR', '/app/output'),
    normalizationLUFS: getEnvNumber('AUDIO_NORMALIZATION_LUFS', -23),
    sampleRate: getEnvNumber('AUDIO_SAMPLE_RATE', 44100),
    bitrate: getEnv('AUDIO_BITRATE', '128k'),
    format: getEnv('AUDIO_FORMAT', 'mp3')
  },

  concurrency: {
    maxConcurrentGenerations: getEnvNumber('MAX_CONCURRENT_GENERATIONS', 10),
    batchSize: getEnvNumber('BATCH_SIZE', 10)
  },

  logging: {
    level: getEnv('LOG_LEVEL', 'info'),
    format: getEnv('LOG_FORMAT', 'json')
  },

  redis: {
    host: getEnv('REDIS_HOST', 'localhost'),
    port: getEnvNumber('REDIS_PORT', 6379),
    password: getEnv('REDIS_PASSWORD', ''),
    db: getEnvNumber('REDIS_DB', 4)
  },

  auth: {
    jwtSecret: getEnv('JWT_SECRET'),
    jwtExpiry: getEnv('JWT_EXPIRY', '24h')
  },

  rateLimit: {
    windowMs: getEnvNumber('RATE_LIMIT_WINDOW_MS', 60000),
    maxRequests: getEnvNumber('RATE_LIMIT_MAX_REQUESTS', 100)
  }
};

export default config;
