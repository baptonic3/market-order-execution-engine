import { Pool } from 'pg';
import { Order, OrderStatus, DexProvider } from '../types/order';
import { getDbPool } from '../db/connection';
import { logger } from '../utils/logger';

export class OrderModel {
  private pool: Pool;

  constructor() {
    this.pool = getDbPool();
  }

  async create(order: Omit<Order, 'createdAt' | 'updatedAt'>): Promise<Order> {
    const query = `
      INSERT INTO orders (
        id, user_id, type, token_in, token_out, amount_in, amount_out,
        status, dex_provider, tx_hash, executed_price, error, retry_count
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING created_at, updated_at
    `;

    const values = [
      order.id,
      order.userId,
      order.type,
      order.tokenIn,
      order.tokenOut,
      order.amountIn,
      order.amountOut || null,
      order.status,
      order.dexProvider || null,
      order.txHash || null,
      order.executedPrice || null,
      order.error || null,
      order.retryCount,
    ];

    try {
      const result = await this.pool.query(query, values);
      return {
        ...order,
        createdAt: result.rows[0].created_at,
        updatedAt: result.rows[0].updated_at,
      };
    } catch (error) {
      logger.error('Error creating order', error);
      throw error;
    }
  }

  async findById(id: string): Promise<Order | null> {
    const query = 'SELECT * FROM orders WHERE id = $1';
    try {
      const result = await this.pool.query(query, [id]);
      if (result.rows.length === 0) {
        return null;
      }
      return this.mapRowToOrder(result.rows[0]);
    } catch (error) {
      logger.error('Error finding order by id', error);
      throw error;
    }
  }

  async updateStatus(
    id: string,
    status: OrderStatus,
    updates?: {
      dexProvider?: DexProvider;
      txHash?: string;
      executedPrice?: number;
      amountOut?: number;
      error?: string;
      retryCount?: number;
    }
  ): Promise<Order> {
    const updateFields: string[] = ['status = $2', 'updated_at = CURRENT_TIMESTAMP'];
    const values: any[] = [id, status];
    let paramIndex = 3;

    if (updates?.dexProvider) {
      updateFields.push(`dex_provider = $${paramIndex}`);
      values.push(updates.dexProvider);
      paramIndex++;
    }

    if (updates?.txHash) {
      updateFields.push(`tx_hash = $${paramIndex}`);
      values.push(updates.txHash);
      paramIndex++;
    }

    if (updates?.executedPrice !== undefined) {
      updateFields.push(`executed_price = $${paramIndex}`);
      values.push(updates.executedPrice);
      paramIndex++;
    }

    if (updates?.amountOut !== undefined) {
      updateFields.push(`amount_out = $${paramIndex}`);
      values.push(updates.amountOut);
      paramIndex++;
    }

    if (updates?.error) {
      updateFields.push(`error = $${paramIndex}`);
      values.push(updates.error);
      paramIndex++;
    }

    if (updates?.retryCount !== undefined) {
      updateFields.push(`retry_count = $${paramIndex}`);
      values.push(updates.retryCount);
      paramIndex++;
    }

    const query = `UPDATE orders SET ${updateFields.join(', ')} WHERE id = $1 RETURNING *`;

    try {
      const result = await this.pool.query(query, values);
      return this.mapRowToOrder(result.rows[0]);
    } catch (error) {
      logger.error('Error updating order status', error);
      throw error;
    }
  }

  async findByUserId(userId: string, limit: number = 50): Promise<Order[]> {
    const query = 'SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2';
    try {
      const result = await this.pool.query(query, [userId, limit]);
      return result.rows.map((row) => this.mapRowToOrder(row));
    } catch (error) {
      logger.error('Error finding orders by user id', error);
      throw error;
    }
  }

  private mapRowToOrder(row: any): Order {
    return {
      id: row.id,
      userId: row.user_id,
      type: row.type,
      tokenIn: row.token_in,
      tokenOut: row.token_out,
      amountIn: parseFloat(row.amount_in),
      amountOut: row.amount_out ? parseFloat(row.amount_out) : undefined,
      status: row.status,
      dexProvider: row.dex_provider,
      txHash: row.tx_hash,
      executedPrice: row.executed_price ? parseFloat(row.executed_price) : undefined,
      error: row.error,
      retryCount: row.retry_count,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

