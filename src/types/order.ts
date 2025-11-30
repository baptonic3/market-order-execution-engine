export enum OrderType {
    MARKET = 'market',
    LIMIT = 'limit',
    SNIPER = 'sniper',
  }
  
  export enum OrderStatus {
    PENDING = 'pending',
    ROUTING = 'routing',
    BUILDING = 'building',
    SUBMITTED = 'submitted',
    CONFIRMED = 'confirmed',
    FAILED = 'failed',
  }
  
  export enum DexProvider {
    RAYDIUM = 'raydium',
    METEORA = 'meteora',
  }
  
  export interface Order {
    id: string;
    userId: string;
    type: OrderType;
    tokenIn: string;
    tokenOut: string;
    amountIn: number;
    amountOut?: number;
    status: OrderStatus;
    dexProvider?: DexProvider;
    txHash?: string;
    executedPrice?: number;
    error?: string;
    retryCount: number;
    createdAt: Date;
    updatedAt: Date;
  }
  
  export interface OrderRequest {
    userId: string;
    type: OrderType;
    tokenIn: string;
    tokenOut: string;
    amountIn: number;
    slippageTolerance?: number;
    limitPrice?: number; // For limit orders
  }
  
  export interface DexQuote {
    provider: DexProvider;
    price: number;
    amountOut: number;
    fee: number;
    estimatedGas?: number;
  }
  
  export interface OrderStatusUpdate {
    orderId: string;
    status: OrderStatus;
    message?: string;
    txHash?: string;
    executedPrice?: number;
    error?: string;
    dexProvider?: DexProvider;
  }
  
  