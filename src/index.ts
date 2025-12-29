/**
 * Main Entry Point for NexusProseCreator-Audiobook
 */

import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { Pool } from 'pg';
import { createApp } from './app';
import { config } from './config';
import { logger } from './utils/logger';
import { flushPendingReports } from './middleware/usage-tracking';

let dbPool: Pool | null = null;

/**
 * Initialize PostgreSQL connection
 */
async function initializeDatabase(): Promise<Pool> {
  logger.info('Initializing PostgreSQL connection...');

  const pool = new Pool({
    host: config.database.postgres.host,
    port: config.database.postgres.port,
    database: config.database.postgres.database,
    user: config.database.postgres.user,
    password: config.database.postgres.password,
    max: config.database.postgres.max,
    idleTimeoutMillis: config.database.postgres.idleTimeoutMillis,
    connectionTimeoutMillis: config.database.postgres.connectionTimeoutMillis
  });

  // Test connection
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    logger.info('✓ PostgreSQL connection established');
  } catch (error) {
    logger.error('✗ PostgreSQL connection failed', { error });
    throw error;
  }

  return pool;
}

/**
 * Start HTTP and WebSocket servers
 */
async function startServers(app: Express.Application): Promise<void> {
  // Create HTTP server
  const httpServer = createServer(app);

  // Create WebSocket server for progress updates
  const wss = new WebSocketServer({ port: config.server.wsPort });

  wss.on('connection', (ws) => {
    logger.info('WebSocket client connected');

    ws.on('message', (message) => {
      logger.debug('WebSocket message received', { message: message.toString() });
    });

    ws.on('close', () => {
      logger.info('WebSocket client disconnected');
    });

    ws.on('error', (error) => {
      logger.error('WebSocket error', { error });
    });
  });

  // Start HTTP server
  return new Promise((resolve) => {
    httpServer.listen(config.server.port, () => {
      logger.info('='.repeat(60));
      logger.info(`🎙️ NexusProseCreator-Audiobook Server started`);
      logger.info(`   Environment: ${config.server.env}`);
      logger.info(`   HTTP Port: ${config.server.port}`);
      logger.info(`   WebSocket Port: ${config.server.wsPort}`);
      logger.info(`   Health: http://localhost:${config.server.port}/audiobook/health`);
      logger.info('='.repeat(60));
      resolve();
    });
  });
}

/**
 * Graceful shutdown
 */
async function shutdown(signal: string): Promise<void> {
  logger.info(`${signal} signal received. Starting graceful shutdown...`);

  try {
    // Flush pending usage reports
    await flushPendingReports();
    logger.info('✓ Usage reports flushed');

    if (dbPool) {
      await dbPool.end();
      logger.info('✓ PostgreSQL pool closed');
    }

    logger.info('Graceful shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', { error });
    process.exit(1);
  }
}

/**
 * Main startup function
 */
async function main(): Promise<void> {
  try {
    // Initialize database
    dbPool = await initializeDatabase();

    // Create Express app
    const app = createApp();

    // Start servers
    await startServers(app);

    // Register shutdown handlers
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

// Start the server
main();
