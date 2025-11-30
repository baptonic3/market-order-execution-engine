import { IDexRouter } from '../../types/dex';
import { MockDexRouter } from './mockDexRouter';
// Future: import { RealDexRouter } from './realDexRouter';

/**
 * DEX Router Factory
 * 
 * This factory allows easy switching between mock and real implementations.
 * To use real Solana devnet execution, change USE_MOCK_DEX to false
 * and implement RealDexRouter class.
 */
const USE_MOCK_DEX = process.env.USE_MOCK_DEX !== 'false';

export const createDexRouter = (): IDexRouter => {
  if (USE_MOCK_DEX) {
    return new MockDexRouter();
  }
  
  // Future: return new RealDexRouter();
  throw new Error('Real DEX router not yet implemented. Set USE_MOCK_DEX=true for mock implementation.');
};

