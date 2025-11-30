import { OrderService } from '../../src/services/orderService';
import { OrderModel } from '../../src/models/orderModel';
import { MockDexRouter } from '../../src/services/dex/mockDexRouter';
import { QueueService } from '../../src/services/queueService';
import { OrderType, OrderStatus, DexProvider } from '../../src/types/order';
import { sleep } from '../../src/utils/sleep';

describe('Order Flow Integration', () => {
  let orderService: OrderService;
  let queueService: QueueService;
  let orderModel: OrderModel;
  let dexRouter: MockDexRouter;

  beforeAll(() => {
    orderModel = new OrderModel();
    dexRouter = new MockDexRouter();
    orderService = new OrderService(orderModel, dexRouter);
    queueService = new QueueService(orderService);
  });

  afterAll(async () => {
    await queueService.close();
  });

  it('should process order through complete lifecycle', async () => {
    // Create order
    const order = await orderService.createOrder({
      userId: 'test-user',
      type: OrderType.MARKET,
      tokenIn: 'SOL',
      tokenOut: 'USDC',
      amountIn: 1,
    });

    expect(order.status).toBe(OrderStatus.PENDING);

    // Add to queue
    await queueService.addOrder(order.id);

    // Wait for processing (with timeout)
    let processedOrder = await orderService.getOrder(order.id);
    const maxWait = 10000; // 10 seconds
    const startTime = Date.now();

    while (
      processedOrder &&
      processedOrder.status !== OrderStatus.CONFIRMED &&
      processedOrder.status !== OrderStatus.FAILED &&
      Date.now() - startTime < maxWait
    ) {
      await sleep(500);
      processedOrder = await orderService.getOrder(order.id);
    }

    // Verify final status
    expect(processedOrder).not.toBeNull();
    if (processedOrder) {
      expect([OrderStatus.CONFIRMED, OrderStatus.FAILED]).toContain(processedOrder.status);
      
      if (processedOrder.status === OrderStatus.CONFIRMED) {
        expect(processedOrder.txHash).toBeDefined();
        expect(processedOrder.executedPrice).toBeGreaterThan(0);
        expect([DexProvider.RAYDIUM, DexProvider.METEORA]).toContain(processedOrder.dexProvider);
      }
    }
  }, 15000);

  it('should handle multiple concurrent orders', async () => {
    const orders = await Promise.all(
      Array.from({ length: 3 }, (_, i) =>
        orderService.createOrder({
          userId: `test-user-${i}`,
          type: OrderType.MARKET,
          tokenIn: 'SOL',
          tokenOut: 'USDC',
          amountIn: 1 + i,
        })
      )
    );

    // Add all to queue
    await Promise.all(orders.map((order) => queueService.addOrder(order.id)));

    // Wait a bit for processing
    await sleep(5000);

    // Check that orders are being processed
    const stats = await queueService.getQueueStats();
    expect(stats.active + stats.completed + stats.waiting).toBeGreaterThanOrEqual(3);
  }, 15000);
});

