The README has setup instructions, key assumptions, API documentation, and architectural decisions — but it's missing the flow diagrams. Here's the updated README with everything:

````markdown
# Vault FX API

A backend system for an FX trading platform built with NestJS, TypeORM, and PostgreSQL. Users can register, verify their email, manage multi-currency wallets, and trade Naira (NGN) against major world currencies using real-time exchange rates.

---

## Tech Stack

- **Framework**: NestJS + TypeScript
- **Database**: PostgreSQL + TypeORM
- **Auth**: JWT (access + refresh tokens) + Passport
- **Email**: Nodemailer (Gmail SMTP)
- **FX Rates**: ExchangeRate-API v6
- **Validation**: class-validator + class-transformer
- **Testing**: Jest

---

## Setup

### Prerequisites

- Node.js 18+
- PostgreSQL 13+

### Installation

```bash
git clone https://github.com/yourusername/vault-fx-api.git
cd vault-fx-api
npm install
cp .env.example .env   # fill in your values
```

### Database

```bash
# Create the database manually before starting the app
createdb vault_fx
```

Migrations run automatically on startup (`migrationsRun: true`).

---

## Environment Configuration

### Development vs Production

The app behaves differently depending on `NODE_ENV`:

| Feature | Development | Production |
|---------|-------------|------------|
| Swagger UI | ✅ Available at `/api/v1/docs` | ❌ Disabled |
| Database `synchronize` | ✅ Auto-syncs schema | ❌ Off (use migrations) |
| Database `logging` | ✅ SQL queries logged | ❌ Off |
| Validation error messages | ✅ Full error details | ❌ Hidden |
| SSL (database) | ❌ Off (`DB_SSL=false`) | ✅ On (`DB_SSL=true`) |

### Switching Environments

To run in **development**:
```env
NODE_ENV=development
DB_SSL=false
```

To run in **production**:
```env
NODE_ENV=production
DB_SSL=true
```

Then start the app:
```bash
# Development (hot reload)
npm run start:dev

# Production
npm run build
npm run start:prod
```

---

## Environment Variables

Create a `.env` file in the project root:

```env
# Server
NODE_ENV=development
PORT=3000
API_PREFIX=api/v1

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=your_db_username
DB_PASSWORD=your_db_password
DB_DATABASE=vault_fx
DB_SSL=false

# JWT
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your_refresh_secret
JWT_REFRESH_EXPIRES_IN=7d

# Security
BCRYPT_ROUNDS=12
CORS_ORIGIN=http://localhost:3001
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Email (Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=your_16_digit_app_password
SMTP_FROM=Vault FX <noreply@vault-fx.com>

# OTP
OTP_EXPIRY_MINUTES=10
OTP_LENGTH=6

# FX Rates
FX_API_URL=https://v6.exchangerate-api.com/v6/YOUR_API_KEY/latest/
FX_API_KEY=your_api_key
FX_CACHE_TTL_SECONDS=300

# Wallet
WALLET_INITIAL_BALANCE=1000

# Redis (optional)
REDIS_HOST=localhost
REDIS_PORT=6379
```

> **Gmail**: Enable 2FA → Security → App Passwords → generate 16-digit password → use as `SMTP_PASS`.

> **FX API**: Sign up at [exchangerate-api.com](https://www.exchangerate-api.com) for a free key.

---

## Admin Seeding

An admin account is automatically created when the app starts if it does not already exist. No manual step is needed.

**Default admin credentials:**
```
Email:    admin@vault-fx.com
Password: Admin@123456
```

The seeder runs on every startup but never duplicates or overwrites the admin — it is safe in both development and production.

> **Important**: Change the admin password immediately after first login in any production environment.

---

## Running Tests

```bash
# Run all tests
npm run test

# Watch mode
npm run test:watch

# Coverage report
npm run test:cov
```

### Test Coverage

| Module | What is Tested |
|--------|---------------|
| `auth.service.spec.ts` | Registration, email verification, login, logout, forgot/reset password, wallet creation on verify |
| `wallets.service.spec.ts` | Fund wallet, convert currency, P2P transfer, idempotency, rollback on failure, decimal precision |
| `transactions.service.spec.ts` | Paginated history, filters, date validation, transaction summary |
| `wallets.controller.spec.ts` | Transfer endpoint, DTO validation, service delegation |
| `users.controller.spec.ts` | Profile endpoint |

---

## API Documentation (Swagger)

Swagger is only available when `NODE_ENV=development`.

```
http://localhost:3000/api/v1/docs
```

Click **Authorize** in Swagger and paste your Bearer token from `POST /auth/login` to test protected endpoints.

---

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | ❌ | Register and receive OTP |
| POST | `/auth/verify-email` | ❌ | Verify email with OTP |
| POST | `/auth/resend-otp` | ❌ | Resend verification OTP |
| POST | `/auth/login` | ❌ | Login, receive tokens |
| POST | `/auth/refresh-token` | ❌ | Refresh access token |
| POST | `/auth/logout` | ✅ | Logout and revoke tokens |
| POST | `/auth/forgot-password` | ❌ | Request password reset OTP |
| POST | `/auth/reset-password` | ❌ | Reset password with OTP |
| GET | `/users/profile` | ✅ | Get authenticated user profile |
| GET | `/wallet` | ✅ | Get all user wallets |
| GET | `/wallet/balance?currency=NGN` | ✅ | Get balance for a currency |
| POST | `/wallet/fund` | ✅ | Fund a wallet |
| POST | `/wallet/convert` | ✅ | Convert between currencies |
| POST | `/wallet/transfer` | ✅ | Transfer to another user |
| POST | `/wallet/trade/ngn-to-foreign` | ✅ | Trade NGN to a foreign currency |
| POST | `/wallet/trade/foreign-to-ngn` | ✅ | Trade foreign currency to NGN |
| GET | `/fx/rates` | ✅ | Get all supported FX rates |
| GET | `/fx/pair?from=NGN&to=USD` | ✅ | Get a specific currency pair rate |
| GET | `/fx/convert?amount=1000&from=NGN&to=USD` | ✅ | Convert amount using live rate |
| GET | `/fx/historical?from=NGN&to=USD&days=7` | ✅ | Get historical rates |
| GET | `/transactions` | ✅ | Paginated transaction history |
| GET | `/transactions/summary?days=30` | ✅ | Transaction summary for a period |
| GET | `/transactions/:reference` | ✅ | Get transaction by reference |

> `Idempotency-Key` header is supported on: `fund`, `convert`, `transfer`, and `trade` endpoints.

---

## Flow Diagrams

### User Registration & Verification Flow

```
POST /auth/register
        │
        ▼
  Validate input
        │
        ▼
  Email already exists? ──Yes──▶ 409 Conflict
        │ No
        ▼
  Hash password (bcrypt)
        │
        ▼
  Create user (isVerified: false)
        │
        ▼
  Send OTP email
        │
        ▼
  201 Registration successful

POST /auth/verify-email
        │
        ▼
  Find user by email
        │
        ▼
  OTP valid & not expired? ──No──▶ 400 Invalid OTP
        │ Yes
        ▼
  Mark user as verified
        │
        ▼
  NGN wallet exists? ──Yes──▶ Skip
        │ No
        ▼
  Create NGN wallet (balance: 1000)
        │
        ▼
  Send welcome email
        │
        ▼
  200 Email verified
```

### Trading Flow (NGN ↔ Foreign)

```
POST /wallet/trade/ngn-to-foreign
        │
        ▼
  Validate currency is supported
        │
        ▼
  Fetch live FX rate (cache → DB → API)
        │
        ▼
  Call convertCurrency service
        │
        ▼
  Check idempotency key ──exists──▶ Return cached response
        │ new
        ▼
  BEGIN DATABASE TRANSACTION
        │
        ▼
  Find NGN wallet ──not found──▶ 400 No NGN wallet
        │ found
        ▼
  Balance >= amount? ──No──▶ 400 Insufficient balance
        │ Yes
        ▼
  Calculate target amount (amount × rate)
        │
        ▼
  Deduct from NGN wallet
        │
        ▼
  Target currency wallet exists?
        │ No              │ Yes
        ▼                 ▼
  Create wallet     Add to balance
  with target amount
        │
        ▼
  Create transaction record (CONVERT)
        │
        ▼
  COMMIT TRANSACTION
        │
        ▼
  Cache response with idempotency key
        │
        ▼
  201 Trade executed successfully
```

### Wallet Transfer Flow (P2P)

```
POST /wallet/transfer
        │
        ▼
  senderId === recipientId? ──Yes──▶ 400 Cannot transfer to yourself
        │ No
        ▼
  Check idempotency key ──exists──▶ Return cached response
        │ new
        ▼
  BEGIN DATABASE TRANSACTION
        │
        ▼
  Find sender wallet ──not found──▶ 400 No wallet
        │ found
        ▼
  Balance >= amount? ──No──▶ 400 Insufficient balance
        │ Yes
        ▼
  Find recipient wallet
        │ not found
        ▼
  Create recipient wallet (balance: 0)
        │
        ▼
  Deduct sender balance
        │
        ▼
  Add to recipient balance
        │
        ▼
  Create transaction record (TRANSFER)
        │
        ▼
  COMMIT TRANSACTION
        │
        ▼
  Cache response with idempotency key
        │
        ▼
  201 Transfer successful
```

### FX Rate Fetching Flow

```
getPairRate(base, target)
        │
        ▼
  base === target? ──Yes──▶ Return 1
        │ No
        ▼
  In-memory cache hit & valid (< 5min)? ──Yes──▶ Return cached rate
        │ No
        ▼
  Database record exists & fresh (< 1hr)? ──Yes──▶ Return DB rate
        │ No
        ▼
  Fetch from ExchangeRate-API v6
        │
        ▼
  API success? ──No──▶ Try cross-rate via USD
        │ Yes             │ fails
        ▼                 ▼
  Store in cache    Use stale DB rate
  Store in DB       or throw 503
        │
        ▼
  Return rate
```

### Idempotency Flow

```
Any mutating wallet request
        │
        ▼
  Idempotency-Key provided? ──No──▶ Generate UUID
        │ Yes
        ▼
  Look up key in DB
        │
        ▼
  Key found?
        │ Yes                    │ No
        ▼                        ▼
  Has responseBody?       Create idempotency record
        │ Yes    │ No      (status: in-progress)
        ▼        ▼               │
  Return    409 Request          ▼
  cached    in progress    Process request
  response                       │
                                 ▼
                           Store response in DB
                                 │
                                 ▼
                           Return response
```

---

## Key Assumptions

- Users receive **1000 NGN initial balance** on email verification
- Supported trading currencies: **USD, EUR, GBP, CAD, JPY, CHF, AUD**
- Recipient wallets are **auto-created** on first transfer or conversion
- FX rates are cached **in-memory for 5 minutes**, with the database as fallback if the provider is unavailable
- Idempotency keys are valid for **24 hours** — sending the same key returns the cached response
- Access tokens expire in **15 minutes**; refresh tokens in **7 days** with rotation on each use
- All wallet and transaction operations are **fully atomic** — any failure triggers a full rollback

---

## Architectural Decisions

**Multi-currency wallets**: One row per user per currency in the wallets table. Wallets are created on demand when a user receives a transfer or completes a conversion — no need to pre-create all currency wallets on registration.

**Idempotency**: Every mutating wallet operation (`fund`, `convert`, `transfer`, `trade`) accepts an optional `Idempotency-Key` header. The key, request body, and response are stored in the database for 24 hours. Duplicate requests within that window return the cached response immediately without re-processing.

**Atomic transactions**: All balance updates and transaction record creation use TypeORM `QueryRunner` with `queryRunner.manager.getRepository()` to ensure every operation within a request participates in the same database transaction. Any failure at any point rolls back all changes — no partial state.

**FX rate caching**: Rates are fetched from ExchangeRate-API v6, stored in an in-memory `Map` with a configurable TTL (default 5 min), and persisted to the database as a fallback. On provider failure, the service falls back to the most recent database rate. Cross-rates (e.g. EUR/GBP) are derived via USD as the intermediary if a direct pair is unavailable.

**Security**: JWT access tokens (15m) with UUID refresh tokens (7d) and full rotation on each refresh. Login attempt tracking with brute force lockout after 5 failed attempts in 15 minutes. Rate limiting on all auth endpoints. Helmet.js security headers applied globally. Swagger disabled in production. Passwords hashed with bcrypt (12 rounds).

**Database schema**: In development, `synchronize: true` auto-updates the schema on startup for fast iteration. In production, `synchronize: false` and TypeORM migrations are used to prevent accidental data loss or schema drift.
````