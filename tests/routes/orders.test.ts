import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import { ordersRoutes } from '../../src/routes/orders';
import { OrderService } from '../../src/services/orderService';
import { QueueService } from '../../src/services/queueService';
import { OrderType, OrderStatus } from '../../src/types/order';

describe('Orders Routes', () => {
  let app: any;
  let mockOrderService: jest.Mocked<OrderService>;
  let mockQueueService: jest.Mocked<QueueService>;

  beforeEach(async () => {
    app = Fastify();
    
    // Register websocket plugin
    await app.register(websocket);
    
    mockOrderService = {
      createOrder: jest.fn(),
      getOrder: jest.fn(),
      getOrdersByUserId: jest.fn(),
      registerStatusCallback: jest.fn(),
      unregisterStatusCallback: jest.fn(),
    } as any;

    mockQueueService = {
      addOrder: jest.fn(),
      getQueueStats: jest.fn(),
    } as any;

    app.decorate('orderService', mockOrderService);
    app.decorate('queueService', mockQueueService);

    await app.register(ordersRoutes);
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /api/orders/execute', () => {
    it('should create and queue a new order', async () => {
      const orderRequest = {
        userId: 'user-1',
        type: OrderType.MARKET,
        tokenIn: 'SOL',
        tokenOut: 'USDC',
        amountIn: 1,
      };

      const mockOrder = {
        id: 'order-1',
        ...orderRequest,
        status: OrderStatus.PENDING,
        retryCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockOrderService.createOrder.mockResolvedValue(mockOrder);
      mockQueueService.addOrder.mockResolvedValue(undefined);

      const response = await app.inject({
        method: 'POST',
        url: '/api/orders/execute',
        payload: orderRequest,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('orderId', 'order-1');
      expect(body).toHaveProperty('status', 'pending');
      expect(mockOrderService.createOrder).toHaveBeenCalledWith(orderRequest);
      expect(mockQueueService.addOrder).toHaveBeenCalledWith('order-1');
    });

    it('should reject invalid request body', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/orders/execute',
        payload: {
          userId: '', // Invalid: empty string
          type: OrderType.MARKET,
          tokenIn: 'SOL',
          tokenOut: 'USDC',
          amountIn: -1, // Invalid: negative amount
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('error', 'Validation error');
    });

    it('should reject non-MARKET orders', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/orders/execute',
        payload: {
          userId: 'user-1',
          type: OrderType.LIMIT,
          tokenIn: 'SOL',
          tokenOut: 'USDC',
          amountIn: 1,
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('error', 'Only MARKET orders are currently supported');
    });
  });

  describe('GET /api/orders/:orderId', () => {
    it('should return order details', async () => {
      const mockOrder = {
        id: 'order-1',
        userId: 'user-1',
        type: OrderType.MARKET,
        tokenIn: 'SOL',
        tokenOut: 'USDC',
        amountIn: 1,
        status: OrderStatus.PENDING,
        retryCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockOrderService.getOrder.mockResolvedValue(mockOrder);

      const response = await app.inject({
        method: 'GET',
        url: '/api/orders/order-1',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('id', 'order-1');
    });

    it('should return 404 if order not found', async () => {
      mockOrderService.getOrder.mockResolvedValue(null);

      const response = await app.inject({
        method: 'GET',
        url: '/api/orders/non-existent',
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('error', 'Order not found');
    });
  });

  describe('GET /api/orders/user/:userId', () => {
    it('should return user orders', async () => {
      const mockOrders = [
        {
          id: 'order-1',
          userId: 'user-1',
          type: OrderType.MARKET,
          tokenIn: 'SOL',
          tokenOut: 'USDC',
          amountIn: 1,
          status: OrderStatus.PENDING,
          retryCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockOrderService.getOrdersByUserId.mockResolvedValue(mockOrders);

      const response = await app.inject({
        method: 'GET',
        url: '/api/orders/user/user-1',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('userId', 'user-1');
      expect(body).toHaveProperty('orders');
      expect(body.orders).toHaveLength(1);
    });
  });

  describe('GET /api/orders/queue/stats', () => {
    it('should return queue statistics', async () => {
      const mockStats = {
        waiting: 5,
        active: 2,
        completed: 100,
        failed: 3,
      };

      mockQueueService.getQueueStats.mockResolvedValue(mockStats);

      const response = await app.inject({
        method: 'GET',
        url: '/api/orders/queue/stats',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toEqual(mockStats);
    });
  });
});

