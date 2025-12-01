# Quick Start Guide

## 1. Install Dependencies

```bash
npm install
```

## 2. Start Infrastructure (PostgreSQL & Redis)

```bash
docker-compose up -d
```

Wait a few seconds for services to be ready. Verify with:
```bash
docker-compose ps
```

## 3. Start the Server

```bash
npm run dev
```

You should see:
```
[INFO] Database initialized successfully
[INFO] Server listening on port 3000
```

## 4. Test the API

### Submit an Order

```bash
curl -X POST http://localhost:3000/api/orders/execute \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-123",
    "type": "market",
    "tokenIn": "SOL",
    "tokenOut": "USDC",
    "amountIn": 1.5
  }'
```

You'll get a response with an `orderId`. Copy it!


### Check Order Status (HTTP)

```bash
curl http://localhost:3000/api/orders/<orderId>
```

### View Queue Statistics

```bash
curl http://localhost:3000/api/orders/queue/stats
```

## 5. Run Tests

```bash
npm test
```

## Troubleshooting

**Port already in use:**
- Change `PORT` in `.env` file

**Database connection error:**
- Ensure PostgreSQL is running: `docker-compose ps`
- Check database credentials in `.env`

**Redis connection error:**
- Ensure Redis is running: `docker-compose ps`
- Check Redis configuration in `.env`

**WebSocket connection fails:**
- Ensure server is running
- Check that orderId exists
- Verify WebSocket endpoint URL

## Next Steps

- Read the full [README.md](./README.md) for detailed documentation
- Import `postman_collection.json` into Postman for API testing
- Review the code structure in `src/` directory

