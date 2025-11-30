import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { OrderService } from '../services/orderService';
import { QueueService } from '../services/queueService';
import { OrderType } from '../types/order';
import { logger } from '../utils/logger';

// Request validation schema
const orderRequestSchema = z.object({
  userId: z.string().min(1),
  type: z.nativeEnum(OrderType),
  tokenIn: z.string().min(1),
  tokenOut: z.string().min(1),
  amountIn: z.number().positive(),
  slippageTolerance: z.number().min(0).max(1).optional(),
  limitPrice: z.number().positive().optional(),
});

export async function ordersRoutes(fastify: FastifyInstance) {
  const orderService = fastify.orderService as OrderService;
  const queueService = fastify.queueService as QueueService;

  /**
   * POST /api/orders/execute
   * Submit a new order and get orderId
   * Connection can be upgraded to WebSocket for status updates
   */
  fastify.post('/api/orders/execute', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Validate request body
      const body = orderRequestSchema.parse(request.body);

      // For now, we only support MARKET orders
      if (body.type !== OrderType.MARKET) {
        return reply.status(400).send({
          error: 'Only MARKET orders are currently supported',
          message: 'Limit and Sniper orders will be supported in future updates',
        });
      }

      // Create order
      const order = await orderService.createOrder(body);

      // Add order to queue
      await queueService.addOrder(order.id);

      // Check if client wants WebSocket upgrade
      const upgrade = request.headers.upgrade;
      if (upgrade && upgrade.toLowerCase() === 'websocket') {
        // Return orderId and indicate WebSocket support
        return reply.send({
          orderId: order.id,
          status: 'pending',
          websocket: true,
          message: 'Connect to WebSocket for live updates',
        });
      }

      // Return orderId for HTTP-only requests
      return reply.status(201).send({
        orderId: order.id,
        status: 'pending',
        message: 'Order submitted successfully',
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'Validation error',
          details: error.errors,
        });
      }

      logger.error('Error creating order', error);
      return reply.status(500).send({
        error: 'Internal server error',
        message: error.message,
      });
    }
  });

  /**
   * WebSocket endpoint for order status updates
   * GET /api/orders/:orderId/status
   */
  fastify.get('/api/orders/:orderId/status', { websocket: true }, (connection, req) => {
    const orderId = (req.params as any).orderId;

    if (!orderId) {
      connection.socket.close(1008, 'Order ID required');
      return;
    }

    logger.info(`WebSocket connection opened for order ${orderId}`);

    // Register status callback
    const statusCallback = (update: any) => {
      try {
        connection.socket.send(JSON.stringify(update));
      } catch (error) {
        logger.error(`Error sending WebSocket update for order ${orderId}`, error);
      }
    };

    orderService.registerStatusCallback(orderId, statusCallback);

    // Send initial order status
    orderService.getOrder(orderId).then((order) => {
      if (order) {
        connection.socket.send(
          JSON.stringify({
            orderId: order.id,
            status: order.status,
            message: 'Connected to order status stream',
          })
        );
      } else {
        connection.socket.send(
          JSON.stringify({
            error: 'Order not found',
            orderId,
          })
        );
        connection.socket.close(1008, 'Order not found');
      }
    });

    // Handle connection close
    connection.socket.on('close', () => {
      logger.info(`WebSocket connection closed for order ${orderId}`);
      orderService.unregisterStatusCallback(orderId);
    });

    // Handle errors
    connection.socket.on('error', (error) => {
      logger.error(`WebSocket error for order ${orderId}`, error);
      orderService.unregisterStatusCallback(orderId);
    });
  });

  /**
   * GET /api/orders/:orderId
   * Get order details
   */
  fastify.get('/api/orders/:orderId', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const orderId = (request.params as any).orderId;
      const order = await orderService.getOrder(orderId);

      if (!order) {
        return reply.status(404).send({
          error: 'Order not found',
          orderId,
        });
      }

      return reply.send(order);
    } catch (error: any) {
      logger.error('Error fetching order', error);
      return reply.status(500).send({
        error: 'Internal server error',
        message: error.message,
      });
    }
  });

  /**
   * GET /api/orders/user/:userId
   * Get all orders for a user
   */
  fastify.get('/api/orders/user/:userId', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.params as any).userId;
      const orders = await orderService.getOrdersByUserId(userId);

      return reply.send({
        userId,
        orders,
        count: orders.length,
      });
    } catch (error: any) {
      logger.error('Error fetching user orders', error);
      return reply.status(500).send({
        error: 'Internal server error',
        message: error.message,
      });
    }
  });

  /**
   * GET /api/orders/queue/stats
   * Get queue statistics
   */
  fastify.get('/api/orders/queue/stats', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const stats = await queueService.getQueueStats();
      return reply.send(stats);
    } catch (error: any) {
      logger.error('Error fetching queue stats', error);
      return reply.status(500).send({
        error: 'Internal server error',
        message: error.message,
      });
    }
  });
}

