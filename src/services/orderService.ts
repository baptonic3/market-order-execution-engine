import { v4 as uuidv4 } from 'uuid';
import { Order, OrderRequest, OrderStatus, OrderType } from '../types/order';
import { OrderModel } from '../models/orderModel';
import { IDexRouter } from '../types/dex';
import { logger } from '../utils/logger';
import { sleep } from '../utils/sleep';

export class OrderService {
  private orderModel: OrderModel;
  private dexRouter: IDexRouter;
  private statusCallbacks: Map<string, (update: any) => void> = new Map();

  constructor(orderModel: OrderModel, dexRouter: IDexRouter) {
    this.orderModel = orderModel;
    this.dexRouter = dexRouter;
  }

  /**
   * Register a callback for order status updates (for WebSocket)
   */
  registerStatusCallback(orderId: string, callback: (update: any) => void): void {
    this.statusCallbacks.set(orderId, callback);
  }

  /**
   * Unregister status callback
   */
  unregisterStatusCallback(orderId: string): void {
    this.statusCallbacks.delete(orderId);
  }

  /**
   * Emit status update to registered callbacks
   */
  private emitStatusUpdate(orderId: string, update: any): void {
    const callback = this.statusCallbacks.get(orderId);
    if (callback) {
      callback(update);
    }
  }

  /**
   * Create a new order
   */
  async createOrder(request: OrderRequest): Promise<Order> {
    const order: Omit<Order, 'createdAt' | 'updatedAt'> = {
      id: uuidv4(),
      userId: request.userId,
      type: request.type,
      tokenIn: request.tokenIn,
      tokenOut: request.tokenOut,
      amountIn: request.amountIn,
      status: OrderStatus.PENDING,
      retryCount: 0,
    };

    const savedOrder = await this.orderModel.create(order);
    logger.info(`Order created: ${savedOrder.id}`, { orderId: savedOrder.id, type: savedOrder.type });

    return savedOrder;
  }

  /**
   * Process order execution
   * This is called by the queue worker
   */
  async processOrder(orderId: string): Promise<void> {
    let order = await this.orderModel.findById(orderId);
    if (!order) {
      throw new Error(`Order not found: ${orderId}`);
    }

    try {
      // Update status: PENDING -> ROUTING
      await this.updateOrderStatus(orderId, OrderStatus.ROUTING);
      await sleep(100); // Small delay for status update

      // Get quotes from all DEX providers
      logger.info(`Fetching quotes for order ${orderId}`);
      const quotes = await this.dexRouter.getAllQuotes(
        order.tokenIn,
        order.tokenOut,
        order.amountIn
      );

      // Select best DEX
      const bestDex = this.dexRouter.selectBestDex(quotes);
      logger.info(`Selected ${bestDex} for order ${orderId}`);

      // Update status: ROUTING -> BUILDING
      await this.updateOrderStatus(orderId, OrderStatus.BUILDING, { dexProvider: bestDex });
      await sleep(500); // Simulate transaction building

      // Update status: BUILDING -> SUBMITTED
      await this.updateOrderStatus(orderId, OrderStatus.SUBMITTED, { dexProvider: bestDex });
      await sleep(200); // Small delay before execution

      // Execute swap
      logger.info(`Executing swap for order ${orderId} on ${bestDex}`);
      const swapResult = await this.dexRouter.executeSwap(bestDex, order);

      // Update status: SUBMITTED -> CONFIRMED
      await this.updateOrderStatus(orderId, OrderStatus.CONFIRMED, {
        dexProvider: bestDex,
        txHash: swapResult.txHash,
        executedPrice: swapResult.executedPrice,
        amountOut: swapResult.amountOut,
      });

      logger.info(`Order ${orderId} completed successfully`, { txHash: swapResult.txHash });
    } catch (error: any) {
      logger.error(`Error processing order ${orderId}`, error);
      
      // Update status to FAILED
      await this.updateOrderStatus(orderId, OrderStatus.FAILED, {
        error: error.message || 'Unknown error occurred',
      });

      throw error; // Re-throw for retry logic
    }
  }

  /**
   * Update order status and emit WebSocket update
   */
  private async updateOrderStatus(
    orderId: string,
    status: OrderStatus,
    updates?: {
      dexProvider?: any;
      txHash?: string;
      executedPrice?: number;
      amountOut?: number;
      error?: string;
      retryCount?: number;
    }
  ): Promise<Order> {
    const order = await this.orderModel.updateStatus(orderId, status, updates);

    // Emit status update via WebSocket
    this.emitStatusUpdate(orderId, {
      orderId: order.id,
      status: order.status,
      dexProvider: order.dexProvider,
      txHash: order.txHash,
      executedPrice: order.executedPrice,
      error: order.error,
      message: this.getStatusMessage(status),
    });

    return order;
  }

  /**
   * Get status message for UI display
   */
  private getStatusMessage(status: OrderStatus): string {
    const messages: Record<OrderStatus, string> = {
      [OrderStatus.PENDING]: 'Order received and queued',
      [OrderStatus.ROUTING]: 'Comparing DEX prices',
      [OrderStatus.BUILDING]: 'Creating transaction',
      [OrderStatus.SUBMITTED]: 'Transaction sent to network',
      [OrderStatus.CONFIRMED]: 'Transaction confirmed',
      [OrderStatus.FAILED]: 'Order execution failed',
    };
    return messages[status] || 'Unknown status';
  }

  /**
   * Get order by ID
   */
  async getOrder(orderId: string): Promise<Order | null> {
    return this.orderModel.findById(orderId);
  }

  /**
   * Get orders by user ID
   */
  async getOrdersByUserId(userId: string): Promise<Order[]> {
    return this.orderModel.findByUserId(userId);
  }
}

