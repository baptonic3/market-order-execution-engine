import { OrderService } from '../../src/services/orderService';
import { OrderModel } from '../../src/models/orderModel';
import { MockDexRouter } from '../../src/services/dex/mockDexRouter';
import { OrderType, OrderStatus } from '../../src/types/order';

// Mock dependencies
jest.mock('../../src/models/orderModel');
jest.mock('../../src/services/dex/mockDexRouter');

describe('OrderService', () => {
  let orderService: OrderService;
  let mockOrderModel: jest.Mocked<OrderModel>;
  let mockDexRouter: jest.Mocked<MockDexRouter>;

  beforeEach(() => {
    mockOrderModel = new OrderModel() as jest.Mocked<OrderModel>;
    mockDexRouter = new MockDexRouter() as jest.Mocked<MockDexRouter>;
    orderService = new OrderService(mockOrderModel, mockDexRouter);
  });

  describe('createOrder', () => {
    it('should create a new order', async () => {
      const request = {
        userId: 'user-1',
        type: OrderType.MARKET,
        tokenIn: 'SOL',
        tokenOut: 'USDC',
        amountIn: 1,
      };

      const mockOrder = {
        id: 'order-1',
        ...request,
        status: OrderStatus.PENDING,
        retryCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockOrderModel.create.mockResolvedValue(mockOrder);

      const result = await orderService.createOrder(request);

      expect(result).toEqual(mockOrder);
      expect(mockOrderModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: request.userId,
          type: request.type,
          tokenIn: request.tokenIn,
          tokenOut: request.tokenOut,
          amountIn: request.amountIn,
          status: OrderStatus.PENDING,
        })
      );
    });
  });

  describe('getOrder', () => {
    it('should retrieve order by id', async () => {
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

      mockOrderModel.findById.mockResolvedValue(mockOrder);

      const result = await orderService.getOrder('order-1');

      expect(result).toEqual(mockOrder);
      expect(mockOrderModel.findById).toHaveBeenCalledWith('order-1');
    });

    it('should return null if order not found', async () => {
      mockOrderModel.findById.mockResolvedValue(null);

      const result = await orderService.getOrder('non-existent');

      expect(result).toBeNull();
    });
  });
});

