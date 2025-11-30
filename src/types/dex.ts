import { DexProvider, Order } from './order';

export interface IDexRouter {
  /**
   * Get quote from a specific DEX provider
   */
  getQuote(
    provider: DexProvider,
    tokenIn: string,
    tokenOut: string,
    amountIn: number
  ): Promise<DexQuote>;

  /**
   * Get quotes from all available DEX providers
   */
  getAllQuotes(
    tokenIn: string,
    tokenOut: string,
    amountIn: number
  ): Promise<DexQuote[]>;

  /**
   * Select the best DEX provider based on quotes
   */
  selectBestDex(quotes: DexQuote[]): DexProvider;

  /**
   * Execute swap on the selected DEX
   */
  executeSwap(provider: DexProvider, order: Order): Promise<SwapResult>;
}

export interface DexQuote {
  provider: DexProvider;
  price: number;
  amountOut: number;
  fee: number;
  estimatedGas?: number;
  latency?: number; // Response time in ms
}

export interface SwapResult {
  txHash: string;
  executedPrice: number;
  amountOut: number;
  gasUsed?: number;
}

