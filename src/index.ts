import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { config } from './config';
import { logger } from './utils/logger';
import { getDbPool, closeDbPool } from './db/connection';
import { OrderModel } from './models/orderModel';
import { createDexRouter } from './services/dex';
import { OrderService } from './services/orderService';
import { QueueService } from './services/queueService';
import { ordersRoutes } from './routes/orders';

// Store app reference for graceful shutdown
let appInstance: Awaited<ReturnType<typeof buildApp>> | null = null;

// Extend Fastify types
declare module 'fastify' {
  interface FastifyInstance {
    orderService: OrderService;
    queueService: QueueService;
  }
}

async function initializeDatabase(): Promise<void> {
  const pool = getDbPool();
  
  // Run migration
  try {
    const migrationSQL = `
      CREATE TABLE IF NOT EXISTS orders (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        token_in VARCHAR(255) NOT NULL,
        token_out VARCHAR(255) NOT NULL,
        amount_in DECIMAL(20, 8) NOT NULL,
        amount_out DECIMAL(20, 8),
        status VARCHAR(50) NOT NULL,
        dex_provider VARCHAR(50),
        tx_hash VARCHAR(255),
        executed_price DECIMAL(20, 8),
        error TEXT,
        retry_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
      CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
      CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
      CREATE INDEX IF NOT EXISTS idx_orders_tx_hash ON orders(tx_hash);
    `;

    await pool.query(migrationSQL);
    logger.info('Database initialized successfully');
  } catch (error) {
    logger.error('Error initializing database', error);
    throw error;
  }
}

async function buildApp() {
  const fastify = Fastify({
    logger: config.server.env === 'development',
  });

  // Register plugins
  await fastify.register(cors, {
    origin: true,
  });

  await fastify.register(websocket);

  // Initialize services
  const orderModel = new OrderModel();
  const dexRouter = createDexRouter();
  const orderService = new OrderService(orderModel, dexRouter);
  const queueService = new QueueService(orderService);

  // Attach services to Fastify instance
  fastify.decorate('orderService', orderService);
  fastify.decorate('queueService', queueService);

  // Register routes
  await fastify.register(ordersRoutes);

  // Health check endpoint
  fastify.get('/health', async () => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'eterna-backend',
    };
  });

  return fastify;
}

async function start() {
  try {
    // Initialize database
    await initializeDatabase();

    // Build app
    const app = await buildApp();
    appInstance = app;

    // Start server
    await app.listen({
      port: config.server.port,
      host: '0.0.0.0',
    });

    logger.info(`Server listening on port ${config.server.port}`);
    logger.info(`Environment: ${config.server.env}`);
  } catch (error) {
    logger.error('Error starting server', error);
    process.exit(1);
  }
}

// Graceful shutdown
async function shutdown() {
  logger.info('Shutting down gracefully');
  if (appInstance) {
    await appInstance.close();
  }
  const pool = getDbPool();
  const queueService = (appInstance as any)?.queueService as QueueService | undefined;
  if (queueService) {
    await queueService.close();
  }
  await closeDbPool();
}

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received');
  await shutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received');
  await shutdown();
  process.exit(0);
});

// Start the server
start();

