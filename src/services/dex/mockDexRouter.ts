import { IDexRouter, DexQuote, SwapResult } from '../../types/dex';
import { DexProvider, Order } from '../../types/order';
import { sleep } from '../../utils/sleep';
import { logger } from '../../utils/logger';
import { v4 as uuidv4 } from 'uuid';

/**
 * Mock DEX Router Implementation
 * 
 * This is a modular mock implementation that simulates DEX behavior.
 * To switch to real Solana devnet execution, replace this with RealDexRouter
 * that implements the same IDexRouter interface.
 */
export class MockDexRouter implements IDexRouter {
  // Base prices for simulation (in USD equivalent)
  private basePrices: Map<string, number> = new Map([
    ['SOL', 100],
    ['USDC', 1],
    ['USDT', 1],
    ['BONK', 0.00001],
  ]);

  /**
   * Get quote from a specific DEX provider
   * Simulates network delay and price variance
   */
  async getQuote(
    provider: DexProvider,
    tokenIn: string,
    tokenOut: string,
    amountIn: number
  ): Promise<DexQuote> {
    const startTime = Date.now();
    
    // Simulate network delay (150-300ms)
    await sleep(150 + Math.random() * 150);

    const basePrice = this.getBasePrice(tokenIn, tokenOut);
    
    // Simulate price variance between DEXs
    // Raydium: 98-102% of base price
    // Meteora: 97-103% of base price (slightly more variance)
    let priceMultiplier: number;
    let fee: number;

    if (provider === DexProvider.RAYDIUM) {
      priceMultiplier = 0.98 + Math.random() * 0.04; // 98-102%
      fee = 0.003; // 0.3% fee
    } else {
      priceMultiplier = 0.97 + Math.random() * 0.06; // 97-103%
      fee = 0.002; // 0.2% fee
    }

    const price = basePrice * priceMultiplier;
    const amountOut = amountIn * price * (1 - fee);
    const latency = Date.now() - startTime;

    logger.debug(`Quote from ${provider}: ${amountOut} ${tokenOut} for ${amountIn} ${tokenIn} (price: ${price})`);

    return {
      provider,
      price,
      amountOut,
      fee,
      latency,
    };
  }

  /**
   * Get quotes from all available DEX providers concurrently
   */
  async getAllQuotes(
    tokenIn: string,
    tokenOut: string,
    amountIn: number
  ): Promise<DexQuote[]> {
    const providers = [DexProvider.RAYDIUM, DexProvider.METEORA];
    
    // Fetch quotes concurrently
    const quotePromises = providers.map((provider) =>
      this.getQuote(provider, tokenIn, tokenOut, amountIn)
    );

    return Promise.all(quotePromises);
  }

  /**
   * Select the best DEX provider based on quotes
   * Considers both price and fees
   */
  selectBestDex(quotes: DexQuote[]): DexProvider {
    if (quotes.length === 0) {
      throw new Error('No quotes available');
    }

    // Calculate effective amount out (after fees)
    const effectiveAmounts = quotes.map((quote) => ({
      provider: quote.provider,
      amountOut: quote.amountOut,
      price: quote.price,
    }));

    // Sort by amount out (descending) - best price wins
    effectiveAmounts.sort((a, b) => b.amountOut - a.amountOut);

    const bestProvider = effectiveAmounts[0].provider;
    logger.info(
      `Best DEX selected: ${bestProvider} with ${effectiveAmounts[0].amountOut} output ` +
      `(vs ${effectiveAmounts[1]?.amountOut || 'N/A'})`
    );

    return bestProvider;
  }

  /**
   * Execute swap on the selected DEX
   * Simulates transaction execution with realistic delays
   */
  async executeSwap(provider: DexProvider, order: Order): Promise<SwapResult> {
    logger.info(`Executing swap on ${provider} for order ${order.id}`);

    // Simulate transaction building and submission (2-3 seconds)
    await sleep(2000 + Math.random() * 1000);

    // Get the quote to determine final execution price
    const quote = await this.getQuote(provider, order.tokenIn, order.tokenOut, order.amountIn);
    
    // Simulate slight price movement during execution (slippage)
    const slippage = 0.995 + Math.random() * 0.01; // 0.5-1.5% slippage
    const finalAmountOut = quote.amountOut * slippage;
    const executedPrice = finalAmountOut / order.amountIn;

    // Generate mock transaction hash
    const txHash = this.generateMockTxHash();

    logger.info(
      `Swap executed on ${provider}: txHash=${txHash}, ` +
      `executedPrice=${executedPrice}, amountOut=${finalAmountOut}`
    );

    return {
      txHash,
      executedPrice,
      amountOut: finalAmountOut,
    };
  }

  /**
   * Get base price for token pair
   * In real implementation, this would fetch from price oracle
   */
  private getBasePrice(tokenIn: string, tokenOut: string): number {
    const priceIn = this.basePrices.get(tokenIn) || 1;
    const priceOut = this.basePrices.get(tokenOut) || 1;
    return priceOut / priceIn;
  }

  /**
   * Generate mock transaction hash
   * In real implementation, this comes from Solana network
   */
  private generateMockTxHash(): string {
    // Generate a Solana-like transaction hash (base58, 88 chars)
    const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    let hash = '';
    for (let i = 0; i < 88; i++) {
      hash += chars[Math.floor(Math.random() * chars.length)];
    }
    return hash;
  }
}

