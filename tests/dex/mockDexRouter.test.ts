import { MockDexRouter } from '../../src/services/dex/mockDexRouter';
import { DexProvider } from '../../src/types/order';

describe('MockDexRouter', () => {
  let router: MockDexRouter;

  beforeEach(() => {
    router = new MockDexRouter();
  });

  describe('getQuote', () => {
    it('should return a quote from Raydium', async () => {
      const quote = await router.getQuote(DexProvider.RAYDIUM, 'SOL', 'USDC', 1);
      
      expect(quote).toHaveProperty('provider', DexProvider.RAYDIUM);
      expect(quote).toHaveProperty('price');
      expect(quote).toHaveProperty('amountOut');
      expect(quote).toHaveProperty('fee', 0.003);
      expect(quote.price).toBeGreaterThan(0);
      expect(quote.amountOut).toBeGreaterThan(0);
    });

    it('should return a quote from Meteora', async () => {
      const quote = await router.getQuote(DexProvider.METEORA, 'SOL', 'USDC', 1);
      
      expect(quote).toHaveProperty('provider', DexProvider.METEORA);
      expect(quote).toHaveProperty('price');
      expect(quote).toHaveProperty('amountOut');
      expect(quote).toHaveProperty('fee', 0.002);
      expect(quote.price).toBeGreaterThan(0);
      expect(quote.amountOut).toBeGreaterThan(0);
    });

    it('should simulate network delay', async () => {
      const startTime = Date.now();
      await router.getQuote(DexProvider.RAYDIUM, 'SOL', 'USDC', 1);
      const duration = Date.now() - startTime;
      
      expect(duration).toBeGreaterThan(100); // Should take at least 100ms
    });
  });

  describe('getAllQuotes', () => {
    it('should return quotes from all DEX providers', async () => {
      const quotes = await router.getAllQuotes('SOL', 'USDC', 1);
      
      expect(quotes).toHaveLength(2);
      expect(quotes.map(q => q.provider)).toContain(DexProvider.RAYDIUM);
      expect(quotes.map(q => q.provider)).toContain(DexProvider.METEORA);
    });

    it('should fetch quotes concurrently', async () => {
      const startTime = Date.now();
      await router.getAllQuotes('SOL', 'USDC', 1);
      const duration = Date.now() - startTime;
      
      // Concurrent requests should take less than 2x sequential time
      expect(duration).toBeLessThan(600);
    });
  });

  describe('selectBestDex', () => {
    it('should select the DEX with best price', async () => {
      const quotes = await router.getAllQuotes('SOL', 'USDC', 1);
      const bestDex = router.selectBestDex(quotes);
      
      expect([DexProvider.RAYDIUM, DexProvider.METEORA]).toContain(bestDex);
    });

    it('should throw error if no quotes provided', () => {
      expect(() => router.selectBestDex([])).toThrow('No quotes available');
    });
  });

  describe('executeSwap', () => {
    it('should execute swap and return transaction hash', async () => {
      const order = {
        id: 'test-order-1',
        userId: 'user-1',
        type: 'market' as any,
        tokenIn: 'SOL',
        tokenOut: 'USDC',
        amountIn: 1,
        status: 'pending' as any,
        retryCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await router.executeSwap(DexProvider.RAYDIUM, order);
      
      expect(result).toHaveProperty('txHash');
      expect(result).toHaveProperty('executedPrice');
      expect(result).toHaveProperty('amountOut');
      expect(result.txHash).toMatch(/^[1-9A-HJ-NP-Za-km-z]{88}$/); // Base58 format
      expect(result.executedPrice).toBeGreaterThan(0);
      expect(result.amountOut).toBeGreaterThan(0);
    });

    it('should simulate execution delay', async () => {
      const order = {
        id: 'test-order-2',
        userId: 'user-1',
        type: 'market' as any,
        tokenIn: 'SOL',
        tokenOut: 'USDC',
        amountIn: 1,
        status: 'pending' as any,
        retryCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const startTime = Date.now();
      await router.executeSwap(DexProvider.METEORA, order);
      const duration = Date.now() - startTime;
      
      expect(duration).toBeGreaterThan(2000); // Should take 2-3 seconds
      expect(duration).toBeLessThan(4000);
    });
  });
});

