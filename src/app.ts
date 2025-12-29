/**
 * Express Application Configuration
 */

import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { logger } from './utils/logger';
import { config } from './config';
import { usageTrackingMiddleware } from './middleware/usage-tracking';

export function createApp(): Application {
  const app = express();

  // Security middleware
  app.use(helmet());

  // CORS configuration
  app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    credentials: true
  }));

  // Compression
  app.use(compression());

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Usage tracking middleware (after body parsing)
  app.use(usageTrackingMiddleware);

  // Health check endpoint
  app.get('/audiobook/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'healthy',
      service: config.server.serviceName,
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    });
  });

  // API routes would be added here
  // app.use('/audiobook/api', apiRoutes);

  // 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      error: 'Not Found',
      path: req.path
    });
  });

  // Error handler
  app.use((err: Error, req: Request, res: Response, _next: Function) => {
    logger.error('Unhandled error', { error: err, path: req.path });
    res.status(500).json({
      error: 'Internal Server Error',
      message: config.server.env === 'development' ? err.message : undefined
    });
  });

  return app;
}

export default createApp;
