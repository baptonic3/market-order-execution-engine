# Order Execution Engine

A modular order execution engine for Solana DEX trading with DEX routing, WebSocket status updates, and queue management.

## 🎯 Overview

This system processes **MARKET orders** (extensible to LIMIT and SNIPER orders) with intelligent DEX routing between Raydium and Meteora. It features:

- **HTTP → WebSocket Pattern**: Single endpoint for order submission and live status updates
- **DEX Router**: Automatically selects best execution venue (Raydium or Meteora)
- **Queue Management**: Handles up to 10 concurrent orders, 100 orders/minute
- **Retry Logic**: Exponential backoff with up to 3 attempts
- **Modular Design**: Easy to switch from mock to real Solana devnet execution

## 🏗️ Architecture

### Order Execution Flow

![image](/flow.png)

### Why MARKET Orders?

**MARKET orders** were chosen as the initial implementation because:
- They represent the most common order type in DEX trading
- Immediate execution simplifies the initial architecture
- Provides a solid foundation for extending to LIMIT and SNIPER orders

**Extending to Other Order Types:**

1. **LIMIT Orders**: Add price monitoring service that checks if limit price is reached before execution
2. **SNIPER Orders**: Add token launch detection service that monitors new token deployments

The same execution engine can handle all three types - only the trigger mechanism differs.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Docker & Docker Compose (for PostgreSQL and Redis)
- npm or yarn

### Installation

1. **Clone and install dependencies:**

```bash
git clone [<repository-url>](https://github.com/baptonic3/market-order-execution-engine.git)
cd market-order-execution-engine
npm install
```

2. **Set up environment variables:**

```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Start dependencies (PostgreSQL & Redis):**

```bash
docker-compose up -d
```

4. **Run database migrations:**

The database schema is automatically created on first startup.

5. **Start the server:**

```bash
npm run dev
```

The server will start on `http://localhost:3000`

## 📡 API Endpoints

### POST `/api/orders/execute`

Submit a new market order.

**Example using curl:**
```bash
curl -X POST http://localhost:3000/api/orders/execute \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-123",
    "type": "market",
    "tokenIn": "SOL",
    "tokenOut": "USDC",
    "amountIn": 1.5,
    "slippageTolerance": 0.01
  }'
```

**Request Body:**
```json
{
  "userId": "user-123",
  "type": "market",
  "tokenIn": "SOL",
  "tokenOut": "USDC",
  "amountIn": 1.5,
  "slippageTolerance": 0.01
}
```

**Response:**
```json
{
  "orderId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "pending",
  "message": "Order submitted successfully"
}
```

### WebSocket `/api/orders/:orderId/status`

**Connection using JavaScript:**
```javascript
const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:3000/api/orders/ORDER_ID/status');

ws.on('open', () => {
  console.log('Connected to order status stream');
});

ws.on('message', (data) => {
  const update = JSON.parse(data);
  console.log('Status update:', update);
  // {
  //   "orderId": "...",
  //   "status": "routing",
  //   "message": "Comparing DEX prices",
  //   "dexProvider": "raydium",
  //   "txHash": "...",
  //   "executedPrice": 100.5,
  //   "error": null
  // }
});

ws.on('error', (error) => {
  console.error('WebSocket error:', error);
});
```

**Status Flow:**
- `pending` → Order received and queued
- `routing` → Comparing DEX prices
- `building` → Creating transaction
- `submitted` → Transaction sent to network
- `confirmed` → Transaction successful (includes `txHash`)
- `failed` → Order execution failed (includes `error`)

### GET `/api/orders/:orderId`

Get order details by ID.

### GET `/api/orders/user/:userId`

Get all orders for a user.

### GET `/api/orders/queue/stats`

Get queue statistics (waiting, active, completed, failed).

### GET `/health`

Health check endpoint.

## 🧪 Testing

Run the test suite:

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

The test suite includes:
- Unit tests for DEX router, order service, and queue service
- Integration tests for complete order flow
- Route tests for API endpoints

**Test Coverage:** ≥10 tests covering routing logic, queue behavior, and WebSocket lifecycle.

## 📦 Project Structure

```
├── src/
│   ├── config/          # Configuration
│   ├── db/              # Database connection & migrations
│   ├── models/          # Data models
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   │   └── dex/         # DEX router (mock & real)
│   ├── types/           # TypeScript types
│   ├── utils/           # Utilities
│   └── index.ts         # Application entry point
├── tests/               # Test suite
├── docker-compose.yml   # Local development dependencies
├── package.json
└── README.md
```

## 🔧 Configuration

Key configuration options in `.env`:

- `MAX_CONCURRENT_ORDERS`: Maximum concurrent order processing (default: 10)
- `ORDERS_PER_MINUTE`: Rate limit for order processing (default: 100)
- `MAX_RETRY_ATTEMPTS`: Maximum retry attempts (default: 3)
- `USE_MOCK_DEX`: Use mock DEX implementation (default: true)

## 🐳 Docker Deployment

Build and run with Docker:

```bash
docker-compose up -d
```

This starts PostgreSQL and Redis. The application can be deployed to any Node.js hosting platform.

## 📊 Monitoring

- Queue statistics: `GET /api/orders/queue/stats`
- Order history: Query PostgreSQL `orders` table
- Logs: Check application logs for routing decisions and errors

## 📝 Postman Collection

Import `postman_collection.json` into Postman for easy API testing.


## 📄 License

[MIT](LICENSE)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

---

**Note:** This is a mock implementation. For production use with Solana devnet, implement the `RealDexRouter`.

