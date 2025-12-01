# Project Structure

```
├── src/
│   ├── config/
│   │   └── index.ts              # Configuration management
│   ├── db/
│   │   ├── connection.ts         # PostgreSQL connection pool
│   │   └── migrations/
│   │       └── 001_create_orders_table.sql
│   ├── models/
│   │   └── orderModel.ts         # Order data access layer
│   ├── routes/
│   │   └── orders.ts             # API routes (HTTP + WebSocket)
│   ├── services/
│   │   ├── dex/
│   │   │   ├── index.ts          # DEX router factory
│   │   │   └── mockDexRouter.ts  # Mock DEX implementation
│   │   ├── orderService.ts       # Order business logic
│   │   └── queueService.ts       # BullMQ queue management
│   ├── types/
│   │   ├── dex.ts                # DEX router interfaces
│   │   └── order.ts              # Order types and enums
│   ├── utils/
│   │   ├── logger.ts             # Logging utility
│   │   └── sleep.ts              # Sleep utility
│   └── index.ts                  # Application entry point
├── tests/
│   ├── dex/
│   │   └── mockDexRouter.test.ts # DEX router tests
│   ├── integration/
│   │   └── orderFlow.test.ts     # End-to-end flow tests
│   ├── queue/
│   │   └── queueService.test.ts   # Queue service tests
│   ├── routes/
│   │   └── orders.test.ts         # API route tests
│   ├── services/
│   │   └── orderService.test.ts   # Order service tests
│   └── setup.ts                   # Test configuration
├── docker-compose.yml             # Local development services
├── jest.config.js                 # Jest configuration
├── package.json                   # Dependencies and scripts
├── postman_collection.json        # Postman API collection
├── QUICKSTART.md                  # Quick start guide
├── README.md                      # Main documentation
├── tsconfig.json                  # TypeScript configuration
└── .env.example                   # Environment variables template
```

## Key Components

### Core Services

1. **OrderService** (`src/services/orderService.ts`)
   - Creates and processes orders
   - Manages order lifecycle
   - Emits WebSocket status updates

2. **QueueService** (`src/services/queueService.ts`)
   - Manages order queue with BullMQ
   - Handles concurrency and rate limiting
   - Implements retry logic with exponential backoff

3. **DEX Router** (`src/services/dex/`)
   - Modular interface for DEX operations
   - Mock implementation for testing
   - Easy to swap for real Solana implementation

### API Layer

- **HTTP Endpoints**: RESTful API for order management
- **WebSocket**: Real-time status updates for orders
- **Health Check**: System health monitoring

### Data Layer

- **PostgreSQL**: Persistent order storage
- **Redis**: Queue management and caching
- **OrderModel**: Data access abstraction

### Testing

- **Unit Tests**: Individual component testing
- **Integration Tests**: End-to-end flow testing
- **Route Tests**: API endpoint testing

## Extension Points

### Adding Solana Devnet Support

1. Create `src/services/dex/realDexRouter.ts`
2. Implement `IDexRouter` interface
3. Update `src/services/dex/index.ts` factory
4. Set `USE_MOCK_DEX=false` in environment

### Adding LIMIT Orders

1. Add price monitoring service
2. Extend order processing logic
3. Add limit price validation
4. Update order types and routes

### Adding SNIPER Orders

1. Add token launch detection service
2. Monitor Solana program deployments
3. Extend order processing logic
4. Update order types and routes

