import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { config } from '../config';
import { OrderService } from './orderService';
import { logger } from '../utils/logger';

export interface OrderJobData {
  orderId: string;
}

export class QueueService {
  private orderQueue: Queue<OrderJobData>;
  private worker: Worker<OrderJobData>;
  private redis: Redis;
  private orderService: OrderService;

  constructor(orderService: OrderService) {
    this.orderService = orderService;
    this.redis = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      maxRetriesPerRequest: null,
    });

    // Create queue with rate limiting
    this.orderQueue = new Queue<OrderJobData>('order-execution', {
      connection: this.redis,
      defaultJobOptions: {
        attempts: config.queue.maxRetryAttempts,
        backoff: {
          type: 'exponential',
          delay: 2000, // Start with 2 seconds
        },
        removeOnComplete: {
          age: 3600, // Keep completed jobs for 1 hour
          count: 1000, // Keep last 1000 completed jobs
        },
        removeOnFail: {
          age: 86400, // Keep failed jobs for 24 hours
        },
      },
    });

    // Create worker with concurrency limit
    this.worker = new Worker<OrderJobData>(
      'order-execution',
      async (job: Job<OrderJobData>) => {
        const { orderId } = job.data;
        logger.info(`Processing order job: ${orderId} (attempt ${job.attemptsMade + 1})`);
        
        try {
          await this.orderService.processOrder(orderId);
          logger.info(`Order job completed: ${orderId}`);
        } catch (error: any) {
          logger.error(`Order job failed: ${orderId}`, error);
          
          // If max attempts reached, update order status to failed
          if (job.attemptsMade >= config.queue.maxRetryAttempts - 1) {
            logger.warn(`Max retry attempts reached for order ${orderId}`);
          }
          
          throw error; // Re-throw to trigger retry
        }
      },
      {
        connection: this.redis,
        concurrency: config.queue.maxConcurrentOrders,
        limiter: {
          max: config.queue.ordersPerMinute,
          duration: 60000, // 1 minute
        },
      }
    );

    // Worker event handlers
    this.worker.on('completed', (job) => {
      logger.info(`Job ${job.id} completed successfully`);
    });

    this.worker.on('failed', (job, err) => {
      logger.error(`Job ${job?.id} failed`, err);
    });

    this.worker.on('error', (err) => {
      logger.error('Worker error', err);
    });
  }

  /**
   * Add order to queue
   */
  async addOrder(orderId: string): Promise<void> {
    await this.orderQueue.add('execute-order', { orderId }, {
      jobId: orderId, // Use orderId as jobId to prevent duplicates
    });
    logger.info(`Order ${orderId} added to queue`);
  }

  /**
   * Get queue stats
   */
  async getQueueStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  }> {
    const [waiting, active, completed, failed] = await Promise.all([
      this.orderQueue.getWaitingCount(),
      this.orderQueue.getActiveCount(),
      this.orderQueue.getCompletedCount(),
      this.orderQueue.getFailedCount(),
    ]);

    return { waiting, active, completed, failed };
  }

  /**
   * Close queue and worker
   */
  async close(): Promise<void> {
    await this.worker.close();
    await this.orderQueue.close();
    await this.redis.quit();
  }
}

