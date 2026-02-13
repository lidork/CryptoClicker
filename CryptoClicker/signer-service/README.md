# Signer Service - ERC-8004 Lite Validator

A minimal backend service that acts as a trusted validator for the Crypto Clicker game, implementing the "Validation Registry" concept from ERC-8004.

## Purpose

This service prevents users from minting arbitrary amounts of tokens by:
1. Validating legitimate gameplay (click counts)
2. Signing mint requests with a validator private key
3. Providing anti-cheat protection through cryptographic signatures

## Validator Address

```
0xc94EdD970dff7fFb3f500969d15632EF1E5Bb2ab
```

**Important**: This address must be set as the validator in the `ClickerToken` contract using `setValidator()`.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment:
   ```bash
   cp .env.example .env
   # Add your validator private key to .env
   ```

3. Start the service:
   ```bash
   npm start
   ```

The service will run on `http://localhost:3001`.

## API Endpoints

### POST /sign

Validates click count and returns a cryptographic signature for minting tokens.

**Request Body:**
```json
{
  "userAddress": "0x...",
  "clickCount": 1000,
  "nonce": 0
}
```

**Response:**
```json
{
  "signature": "0x...",
  "amount": "10000000000000000000",
  "clkAmount": 10
}
```

**Validation Rules:**
- Click count must be between 100-10,000
- Nonce must match on-chain nonce
- User address must be valid

### GET /health

Health check endpoint.

**Response:**
```json
{
  "status": "online",
  "validatorAddress": "0xc94EdD970dff7fFb3f500969d15632EF1E5Bb2ab"
}
```

## Security

- Private key stored in `.env` (never commit!)
- Message format matches Solidity: `keccak256(abi.encodePacked(userAddress, amount, nonce))`
- EIP-191 prefix applied automatically by ethers.js
- All requests logged for audit trail

## Integration

The frontend calls this service instead of self-signing:

```typescript
const response = await fetch('http://localhost:3001/sign', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ userAddress, clickCount, nonce })
});

const { signature, amount } = await response.json();
await clickerTokenContract.mint(userAddress, amount, signature, nonce);
```

## Production Deployment

For production, deploy this service to:
- Heroku / Railway (Node.js hosting)
- AWS Lambda (serverless)
- DigitalOcean App Platform

Update frontend's `VITE_SIGNER_API` environment variable to point to production URL.
