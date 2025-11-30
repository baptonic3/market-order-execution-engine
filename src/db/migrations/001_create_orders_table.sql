-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  token_in VARCHAR(255) NOT NULL,
  token_out VARCHAR(255) NOT NULL,
  amount_in DECIMAL(20, 8) NOT NULL,
  amount_out DECIMAL(20, 8),
  status VARCHAR(50) NOT NULL,
  dex_provider VARCHAR(50),
  tx_hash VARCHAR(255),
  executed_price DECIMAL(20, 8),
  error TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_tx_hash ON orders(tx_hash);

