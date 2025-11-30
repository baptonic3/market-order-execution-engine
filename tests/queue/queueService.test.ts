import { QueueService } from '../../src/services/queueService';
import { OrderService } from '../../src/services/orderService';
import { OrderModel } from '../../src/models/orderModel';
import { MockDexRouter } from '../../src/services/dex/mockDexRouter';

describe('QueueService', () => {
  let queueService: QueueService;
  let orderService: OrderService;

  beforeAll(() => {
    const orderModel = new OrderModel();
    const dexRouter = new MockDexRouter();
    orderService = new OrderService(orderModel, dexRouter);
    queueService = new QueueService(orderService);
  });

  afterAll(async () => {
    await queueService.close();
  });

  it('should add order to queue', async () => {
    await expect(queueService.addOrder('test-order-1')).resolves.not.toThrow();
  });

  it('should get queue statistics', async () => {
    const stats = await queueService.getQueueStats();
    
    expect(stats).toHaveProperty('waiting');
    expect(stats).toHaveProperty('active');
    expect(stats).toHaveProperty('completed');
    expect(stats).toHaveProperty('failed');
    
    expect(typeof stats.waiting).toBe('number');
    expect(typeof stats.active).toBe('number');
    expect(typeof stats.completed).toBe('number');
    expect(typeof stats.failed).toBe('number');
  });
});

