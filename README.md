# 🏦 Vault FX API

## A Production-Ready Foreign Exchange Trading Platform

[![NestJS](https://img.shields.io/badge/NestJS-10.0-E0234E?style=for-the-badge&logo=nestjs)](https://nestjs.com/)
[![TypeORM](https://img.shields.io/badge/TypeORM-0.3-FE080?style=for-the-badge&logo=typeorm)](https://typeorm.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?style=for-the-badge&logo=postgresql)](https://www.postgresql.org/)
[![JWT](https://img.shields.io/badge/JWT-Auth-000000?style=for-the-badge&logo=json-web-tokens)](https://jwt.io/)
[![Swagger](https://img.shields.io/badge/Swagger-Docs-85EA2D?style=for-the-badge&logo=swagger)](https://swagger.io/)

---

## 📋 Table of Contents

1. [Overview](#-overview)
2. [Features](#-features)
3. [Tech Stack](#-tech-stack)
4. [Setup Instructions](#-setup-instructions)
5. [Environment Variables](#-environment-variables)
6. [Database Schema](#-database-schema)
7. [API Documentation](#-api-documentation)
8. [Architectural Decisions](#-architectural-decisions)
9. [Flow Diagrams](#-flow-diagrams)
10. [Testing Strategy](#-testing-strategy)
11. [Security Considerations](#-security-considerations)
12. [Key Assumptions](#-key-assumptions)
13. [Troubleshooting](#-troubleshooting)

---

## 🎯 Overview

Vault FX API is a robust, scalable backend service for a foreign exchange trading application. It enables users to register, verify their email, manage multi-currency wallets, and trade Naira (NGN) against major world currencies (USD, EUR, GBP) with real-time exchange rates.

Built with enterprise-grade security and reliability in mind, this API implements industry best practices including idempotency, atomic transactions, pessimistic locking, and comprehensive error handling.

**Purpose:** This API powers a fintech platform where users can speculate on currency pairs, similar to traditional forex trading but with a focus on the Nigerian market.

---

## ✨ Features

### Core Functionality
| Feature | Description | Endpoint |
|---------|-------------|----------|
| **User Registration** | Email-based registration with OTP verification | `POST /auth/register` |
| **Email Verification** | 6-digit OTP verification with 10-minute expiry | `POST /auth/verify` |
| **JWT Authentication** | Access tokens (15m) + Refresh tokens (7d) | `POST /auth/login` |
| **Password Reset** | OTP-based password reset flow | `POST /auth/forgot-password` |
| **Multi-Currency Wallets** | Separate wallets per currency (NGN, USD, EUR, GBP) | `GET /wallet` |
| **Wallet Funding** | Idempotent funding with atomic transactions | `POST /wallet/fund` |
| **Currency Conversion** | Convert between any supported currencies | `POST /wallet/convert` |
| **NGN Trading** | Specialized endpoints for NGN trading | `POST /wallet/trade/*` |
| **Real-time FX Rates** | Live rates with 5-minute caching | `GET /fx/rates` |
| **Transaction History** | Paginated, filterable transaction log | `GET /transactions` |
| **P2P Transfers** | Send money to other users | `POST /wallet/transfer` |

### Security Features
| Feature | Implementation |
|---------|----------------|
| **Rate Limiting** | 3-30 requests/minute based on endpoint |
| **Idempotency** | 24-hour key expiry, prevents duplicates |
| **SQL Injection** | TypeORM with parameterized queries |
| **XSS Protection** | Helmet.js security headers |
| **CORS** | Whitelisted origins only |
| **Password Hashing** | bcrypt with 12 rounds |
| **JWT Rotation** | Refresh tokens with revocation |
| **Brute Force Protection** | Login attempt tracking |

### Bonus Features
| Feature | Status | Description |
|---------|--------|-------------|
| **Role-Based Access** | ✅ | Admin vs regular users |
| **FX Caching** | ✅ | In-memory cache with fallback |
| **Transaction Verification** | ✅ | Idempotency with request/response caching |
| **Analytics** | ✅ | Full transaction logging with metadata |

---

## 🛠 Tech Stack

### Core Framework
| Technology | Version | Purpose |
|------------|---------|---------|
| [NestJS](https://nestjs.com/) | 10.0 | Node.js framework with modular architecture |
| [TypeScript](https://www.typescriptlang.org/) | 5.0 | Type-safe JavaScript |
| [Node.js](https://nodejs.org/) | 18+ | Runtime environment |

### Database & ORM
| Technology | Version | Purpose |
|------------|---------|---------|
| [PostgreSQL](https://www.postgresql.org/) | 15 | Primary database |
| [TypeORM](https://typeorm.io/) | 0.3 | ORM with migrations |
| [Redis](https://redis.io/) | Optional | Production caching layer |

### Authentication & Security
| Technology | Purpose |
|------------|---------|
| [JWT](https://jwt.io/) | Stateless authentication |
| [Passport](http://www.passportjs.org/) | Authentication strategies |
| [bcrypt](https://github.com/kelektiv/node.bcrypt.js) | Password hashing |
| [helmet](https://helmetjs.github.io/) | Security headers |
| [class-validator](https://github.com/typestack/class-validator) | Input validation |

### Supporting Libraries
| Technology | Purpose |
|------------|---------|
| [uuid](https://github.com/uuidjs/uuid) | Unique ID generation |
| [nodemailer](https://nodemailer.com/) | Email delivery |
| [otp-generator](https://github.com/Maheshkumar-Kakade/otp-generator) | OTP generation |
| [axios](https://axios-http.com/) | HTTP client for FX rates |

### Development Tools
| Tool | Purpose |
|------|---------|
| [Jest](https://jestjs.io/) | Unit testing |
| [Supertest](https://github.com/visionmedia/supertest) | E2E testing |
| [ESLint](https://eslint.org/) | Code linting |
| [Prettier](https://prettier.io/) | Code formatting |

---

## 📦 Setup Instructions

### Prerequisites

| Requirement | Version | Verification Command |
|-------------|---------|---------------------|
| Node.js | 18.x or higher | `node --version` |
| npm | 9.x or higher | `npm --version` |
| PostgreSQL | 13.x or higher | `postgres --version` |
| Git | Latest | `git --version` |

### Step 1: Clone Repository

```bash
# Clone the repository
git clone https://github.com/yourusername/vault-fx-api.git

# Navigate to project directory
cd vault-fx-api

# Checkout main branch
git checkout main
```

### Step 2: Install Dependencies

```bash
# Install all dependencies
npm install

# Install additional type definitions (if needed)
npm install -D @types/bcrypt @types/passport-jwt @types/passport-local @types/nodemailer @types/otp-generator @types/uuid
```

### Step 3: Environment Configuration

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your configuration
nano .env  # or use any text editor
```

### Step 4: Database Setup

```bash
# Create PostgreSQL database
createdb vault_fx


# (Optional) Seed database with test data
npm run seed
```

### Step 5: Start the Application

```bash
# Development mode (with hot reload)
npm run start:dev

# Production build
npm run build
npm run start:prod

# Debug mode
npm run start:debug
```


---

## 🔐 Environment Variables

### Complete .env.example

```env
check ,env,ecample file for this
```

### Getting Gmail App Password

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable **2-Factor Authentication**
3. Go to **App Passwords**
4. Select **Mail** and **Other (Custom name)**
5. Enter "Vault FX API"
6. Copy the 16-digit password
7. Use as `SMTP_PASS`

---

## 📊 Database Schema

### Entity Relationship Diagram

```mermaid
erDiagram
    User ||--o{ Wallet : has
    User ||--o{ Transaction : makes
    User ||--o{ EmailVerification : requests
    User ||--o{ RefreshToken : owns
    User ||--o{ PasswordReset : initiates
    User ||--o{ LoginAttempt : generates
    
    Wallet ||--o{ Transaction : involved_in
    
    Transaction ||--o{ IdempotencyRecord : tracks
    
    User {
        uuid id PK
        string email UK
        string passwordHash
        boolean isVerified
        string role
        timestamp lastLoginAt
        timestamp createdAt
        timestamp updatedAt
    }
    
    Wallet {
        uuid id PK
        uuid userId FK
        string currency
        decimal balance
        boolean isActive
        timestamp createdAt
        timestamp updatedAt
    }
    
    Transaction {
        uuid id PK
        uuid userId FK
        uuid walletId FK
        enum type
        enum status
        string sourceCurrency
        string targetCurrency
        decimal sourceAmount
        decimal targetAmount
        decimal fxRate
        string reference UK
        jsonb metadata
        timestamp createdAt
        timestamp completedAt
    }
    
    EmailVerification {
        uuid id PK
        uuid userId FK
        string otpCode
        timestamp expiresAt
        int attempts
        boolean isUsed
        timestamp createdAt
    }
    
    RefreshToken {
        uuid id PK
        uuid userId FK
        string token UK
        timestamp expiresAt
        boolean isRevoked
        string replacedByToken
        string userAgent
        string ipAddress
        timestamp createdAt
    }
    
    IdempotencyRecord {
        uuid id PK
        string key UK
        uuid userId
        string endpoint
        jsonb requestBody
        jsonb responseBody
        int responseCode
        timestamp expiresAt
        timestamp createdAt
    }
```

### Key Indexes

```sql
-- Users
CREATE INDEX idx_users_email ON users(email);

-- Wallets
CREATE INDEX idx_wallets_user_id ON wallets(user_id);
CREATE UNIQUE INDEX idx_wallets_user_currency ON wallets(user_id, currency);

-- Transactions
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_reference ON transactions(reference);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);

-- Idempotency
CREATE INDEX idx_idempotency_key ON idempotency_records(key);
CREATE INDEX idx_idempotency_expires ON idempotency_records(expires_at);

-- FX Rates
CREATE INDEX idx_fx_rates_currencies ON fx_rates(base_currency, target_currency);
```

---

## 📚 API Documentation

### Base URL
```
http://localhost:3000/api/v1
```

### Authentication Format
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Idempotency Header
```
Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000
```

### Rate Limits

| Endpoint Category | Limit | Window |
|-------------------|-------|--------|
| Authentication | 5 requests | 1 minute |
| Wallet Operations | 30 requests | 1 minute |
| Trading | 20 requests | 1 minute |
| FX Rates | 60 requests | 1 minute |

---

## 🔐 Authentication Module

### `POST /auth/register`
Register a new user and send verification OTP.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "Test@123456"
}
```

**Validation Rules:**
- `email`: Valid email format
- `password`: Min 8 chars, 1 uppercase, 1 lowercase, 1 number/special

**Response:** `201 Created`
```json
{
  "message": "Registration successful. Please check your email for verification OTP."
}
```

---

### `POST /auth/verify`
Verify email with OTP.

**Request Body:**
```json
{
  "email": "user@example.com",
  "otp": "483729"
}
```

**Response:** `200 OK`
```json
{
  "message": "Email verified successfully. You can now log in."
}
```

---

### `POST /auth/login`
Authenticate user and receive tokens.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "Test@123456"
}
```

**Response:** `200 OK`
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "550e8400-e29b-41d4-a716-446655440000",
  "user": {
    "id": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
    "email": "user@example.com",
    "role": "user",
    "isVerified": true
  }
}
```

---

### `POST /auth/refresh-token`
Get new access token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response:** `200 OK`
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "660e8400-e29b-41d4-a716-446655440001"
}
```

---

### `POST /auth/forgot-password`
Request password reset OTP.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:** `200 OK`
```json
{
  "message": "If a user with that email exists, a password reset OTP has been sent."
}
```

---

### `POST /auth/reset-password`
Reset password with OTP.

**Request Body:**
```json
{
  "email": "user@example.com",
  "otp": "789123",
  "newPassword": "NewTest@123456"
}
```

**Response:** `200 OK`
```json
{
  "message": "Password reset successfully. You can now log in with your new password."
}
```

---

### `POST /auth/logout`
Logout user and revoke tokens.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body (Optional):**
```json
{
  "refreshToken": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response:** `200 OK`
```json
{
  "message": "Logged out successfully"
}
```

---

## 👛 Wallet Module

### `GET /wallet`
Get all wallets for authenticated user.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:** `200 OK`
```json
[
  {
    "id": "7fb1d107-ac3d-4abc-a8a5-a8ae395eca4d",
    "currency": "NGN",
    "balance": 100000,
    "isActive": true,
    "createdAt": "2024-03-17T16:13:38.843Z",
    "updatedAt": "2024-03-17T19:04:06.265Z"
  },
  {
    "id": "5a27becf-4d3b-454d-adc6-db3bec541301",
    "currency": "USD",
    "balance": 36.37,
    "isActive": true,
    "createdAt": "2024-03-17T17:18:15.367Z",
    "updatedAt": "2024-03-17T19:04:06.270Z"
  }
]
```

---

### `GET /wallet/balance`
Get balance for specific currency.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
```
?currency=USD
```

**Response:** `200 OK`
```json
{
  "currency": "USD",
  "balance": 36.37,
  "walletId": "5a27becf-4d3b-454d-adc6-db3bec541301"
}
```

---

### `POST /wallet/fund`
Fund wallet with idempotency support.

**Headers:**
```
Authorization: Bearer <access_token>
Idempotency-Key: fund-request-123
Content-Type: application/json
```

**Request Body:**
```json
{
  "currency": "NGN",
  "amount": 50000
}
```

**Validation Rules:**
- `currency`: 3-letter code (NGN, USD, EUR, GBP)
- `amount`: Minimum 100, positive number

**Response:** `201 Created`
```json
{
  "message": "Wallet funded successfully",
  "data": {
    "reference": "FUND_1712345678901_abc123",
    "currency": "NGN",
    "amount": 50000,
    "newBalance": 150000,
    "timestamp": "2024-03-17T12:05:00.000Z"
  }
}
```

---

### `POST /wallet/convert`
Convert between currencies.

**Headers:**
```
Authorization: Bearer <access_token>
Idempotency-Key: convert-request-456
Content-Type: application/json
```

**Request Body:**
```json
{
  "fromCurrency": "NGN",
  "toCurrency": "USD",
  "amount": 50000,
  "fxRate": 0.000645
}
```

**Response:** `200 OK`
```json
{
  "message": "Currency conversion successful",
  "data": {
    "reference": "CONV_1712345678902_def456",
    "fromCurrency": "NGN",
    "toCurrency": "USD",
    "fromAmount": 50000,
    "toAmount": 32.25,
    "rate": 0.000645,
    "timestamp": "2024-03-17T12:10:00.000Z"
  }
}
```

---

### `POST /wallet/transfer`
Transfer funds to another user.

**Headers:**
```
Authorization: Bearer <access_token>
Idempotency-Key: transfer-request-789
Content-Type: application/json
```

**Request Body:**
```json
{
  "recipientId": "b1b2c3d4-e5f6-7890-1234-567890abcdef",
  "currency": "NGN",
  "amount": 10000
}
```

**Response:** `200 OK`
```json
{
  "message": "Transfer successful",
  "data": {
    "reference": "TRF_1712345678903_ghi789",
    "currency": "NGN",
    "amount": 10000,
    "recipientId": "b1b2c3d4-e5f6-7890-1234-567890abcdef",
    "senderNewBalance": 40000,
    "timestamp": "2024-03-17T12:15:00.000Z"
  }
}
```

---

## 💱 Trading Module

### `POST /wallet/trade/ngn-to-foreign`
Trade Naira to foreign currency.

**Headers:**
```
Authorization: Bearer <access_token>
Idempotency-Key: trade-ngn-usd-123
Content-Type: application/json
```

**Request Body:**
```json
{
  "targetCurrency": "USD",
  "amount": 50000
}
```

**Response:** `200 OK`
```json
{
  "message": "Trade executed successfully",
  "data": {
    "reference": "CONV_1773777846272_81c17e55",
    "tradeType": "NGN_TO_FOREIGN",
    "fromCurrency": "NGN",
    "toCurrency": "USD",
    "fromAmount": 50000,
    "toAmount": 36.37,
    "rate": 0.00072735,
    "timestamp": "2024-03-17T20:04:06.272Z"
  }
}
```

---

### `POST /wallet/trade/foreign-to-ngn`
Trade foreign currency to Naira.

**Headers:**
```
Authorization: Bearer <access_token>
Idempotency-Key: trade-usd-ngn-456
Content-Type: application/json
```

**Request Body:**
```json
{
  "sourceCurrency": "USD",
  "amount": 36.37
}
```

**Response:** `200 OK`
```json
{
  "message": "Trade executed successfully",
  "data": {
    "reference": "CONV_1773777846273_82d18e66",
    "tradeType": "FOREIGN_TO_NGN",
    "fromCurrency": "USD",
    "toCurrency": "NGN",
    "fromAmount": 36.37,
    "toAmount": 50000,
    "rate": 1375.50,
    "timestamp": "2024-03-17T20:05:00.000Z"
  }
}
```

---

## 💱 FX Rates Module

### `GET /fx/rates`
Get real-time exchange rates.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
```
?baseCurrency=USD&targetCurrencies=NGN,EUR,GBP
```

**Response:** `200 OK`
```json
{
  "base": "USD",
  "rates": {
    "NGN": 1550.50,
    "EUR": 0.92,
    "GBP": 0.79
  },
  "timestamp": "2024-03-17T12:15:00.000Z"
}
```

---

### `GET /fx/pair`
Get rate for specific currency pair.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
```
?from=NGN&to=USD
```

**Response:** `200 OK`
```json
{
  "from": "NGN",
  "to": "USD",
  "rate": 0.000645,
  "timestamp": "2024-03-17T12:20:00.000Z"
}
```

---

### `GET /fx/convert`
Convert amount using real-time rates.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
```
?amount=50000&from=NGN&to=USD
```

**Response:** `200 OK`
```json
{
  "amount": 50000,
  "rate": 0.000645,
  "result": 32.25,
  "timestamp": "2024-03-17T12:25:00.000Z"
}
```

---

## 📜 Transactions Module

### `GET /transactions`
Get paginated transaction history.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
```
?page=1&limit=10&type=FUND&status=COMPLETED&fromDate=2024-03-01&toDate=2024-03-17
```

**Available Filters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10, max: 100)
- `type`: FUND, CONVERT, TRADE, TRANSFER
- `status`: PENDING, COMPLETED, FAILED, REVERSED
- `fromDate`: Start date (ISO format)
- `toDate`: End date (ISO format)

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "uuid-1",
      "type": "TRADE",
      "status": "COMPLETED",
      "sourceCurrency": "NGN",
      "targetCurrency": "USD",
      "sourceAmount": 50000,
      "targetAmount": 36.37,
      "fxRate": 0.00072735,
      "reference": "CONV_1773777846272_81c17e55",
      "createdAt": "2024-03-17T20:04:06.272Z",
      "completedAt": "2024-03-17T20:04:06.272Z"
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "limit": 10,
    "pages": 1,
    "hasNext": false,
    "hasPrevious": false
  }
}
```

---

### `GET /transactions/reference/:reference`
Get transaction by reference.

**Headers:**
```
Authorization: Bearer <access_token>
```

**URL Parameters:**
```
/transactions/reference/CONV_1773777846272_81c17e55
```

**Response:** `200 OK`
```json
{
  "id": "uuid-1",
  "type": "TRADE",
  "status": "COMPLETED",
  "sourceCurrency": "NGN",
  "targetCurrency": "USD",
  "sourceAmount": 50000,
  "targetAmount": 36.37,
  "fxRate": 0.00072735,
  "reference": "CONV_1773777846272_81c17e55",
  "createdAt": "2024-03-17T20:04:06.272Z",
  "completedAt": "2024-03-17T20:04:06.272Z"
}
```

---

## 👤 User Module

### `GET /users/profile`
Get current user profile.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:** `200 OK`
```json
{
  "id": "7fb1d107-ac3d-4abc-a8a5-a8ae395eca4d",
  "email": "user@example.com",
  "role": "user",
  "isVerified": true,
  "createdAt": "2024-03-17T16:13:38.843Z",
  "updatedAt": "2024-03-17T19:04:06.265Z"
}
```

---

## 🛡️ Admin Module (Role Required: `admin`)

### `GET /admin/users`
List all users (admin only).

**Headers:**
```
Authorization: Bearer <admin_access_token>
```

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "7fb1d107-ac3d-4abc-a8a5-a8ae395eca4d",
      "email": "user@example.com",
      "role": "user",
      "isVerified": true,
      "createdAt": "2024-03-17T16:13:38.843Z"
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "limit": 10,
    "pages": 1
  }
}
```

---

### `PATCH /admin/users/:id/role`
Change user role (admin only).

**Headers:**
```
Authorization: Bearer <admin_access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "role": "admin"
}
```

**Response:** `200 OK`
```json
{
  "message": "User role updated successfully",
  "user": {
    "id": "7fb1d107-ac3d-4abc-a8a5-a8ae395eca4d",
    "email": "user@example.com",
    "role": "admin",
    "isVerified": true
  }
}
```

---

## 🏗 Architectural Decisions

### 1. Modular Architecture

```
src/
├── modules/          # Feature modules
│   ├── auth/        # Authentication
│   ├── users/       # User management
│   ├── wallets/     # Wallet operations
│   ├── transactions/# Transaction tracking
│   ├── fx/          # FX rates
│   ├── trading/     # Trading logic
│   └── email/       # Email service
├── common/          # Shared utilities
├── config/          # Configuration
└── database/        # Database setup
```

**Rationale:**
- Separation of concerns
- Easy to test
- Scalable (add features without breaking existing)
- Team can work in parallel

### 2. Database Design Decisions

| Decision | Rationale |
|----------|-----------|
| **PostgreSQL** | ACID compliance, JSONB support, reliability |
| **UUID Primary Keys** | Security (no sequential IDs), distributed systems |
| **Decimal(20,8)** | Precision for currency (no floating point errors) |
| **JSONB Fields** | Flexible metadata storage |
| **Pessimistic Locking** | Prevent race conditions in financial transactions |
| **Composite Indexes** | Optimize common queries |

### 3. Security Architecture

| Layer | Implementation |
|-------|----------------|
| **Transport** | HTTPS (production), Helmet.js headers |
| **Authentication** | JWT with short-lived access tokens |
| **Authorization** | Role-based guards (user/admin) |
| **Input Validation** | Class-validator with DTOs |
| **Rate Limiting** | Throttler module per endpoint |
| **Idempotency** | 24-hour key storage |
| **SQL Injection** | TypeORM parameterized queries |
| **XSS** | Helmet.js CSP headers |

### 4. Caching Strategy

| Cache Type | Implementation | TTL |
|------------|----------------|-----|
| **FX Rates** | In-memory Map | 5 minutes |
| **Idempotency** | Database records | 24 hours |
| **User Sessions** | JWT (stateless) | 15 minutes |

### 5. Error Handling Strategy

```typescript
try {
  // Operation
} catch (error) {
  // 1. Log error with context
  // 2. Rollback transaction
  // 3. Return appropriate HTTP status
  // 4. User-friendly message
}
```

---

## 🔄 Flow Diagrams

### Trading Flow

```mermaid
graph TD
    A[User Requests Trade] --> B{Valid Amount?}
    B -->|No| C[Return Error]
    B -->|Yes| D{Has Wallet?}
    D -->|No| E[Create Wallet]
    D -->|Yes| F[Check Balance]
    E --> F
    F --> G{Sufficient Balance?}
    G -->|No| H[Return Insufficient Funds]
    G -->|Yes| I[Get FX Rate]
    I --> J[Calculate Target Amount]
    J --> K[Start DB Transaction]
    K --> L[Lock Wallets]
    L --> M[Deduct Source Currency]
    M --> N[Add Target Currency]
    N --> O[Create Transaction Record]
    O --> P[Commit Transaction]
    P --> Q[Return Success Response]
```

### Wallet Transfer Flow

```mermaid
graph TD
    A[User Requests Transfer] --> B{Valid Recipient?}
    B -->|No| C[Return Error]
    B -->|Yes| D{Has Wallet?}
    D -->|No| E[Return No Wallet Error]
    D -->|Yes| F[Check Balance]
    F --> G{Sufficient Balance?}
    G -->|No| H[Return Insufficient Funds]
    G -->|Yes| I{Recipient Has Wallet?}
    I -->|No| J[Create Recipient Wallet]
    I -->|Yes| K[Get Recipient Wallet]
    J --> K
    K --> L[Start DB Transaction]
    L --> M[Lock Both Wallets]
    M --> N[Deduct Sender Balance]
    N --> O[Add Recipient Balance]
    O --> P[Create Transfer Record]
    P --> Q[Commit Transaction]
    Q --> R[Return Success Response]
```

### Idempotency Flow

```mermaid
graph TD
    A[Client Request] --> B{Has Idempotency Key?}
    B -->|No| C[Generate UUID]
    B -->|Yes| D[Use Provided Key]
    C --> E[Check if Key Exists]
    D --> E
    E --> F{Key Found?}
    F -->|Yes| G[Return Cached Response]
    F -->|No| H[Process Request]
    H --> I[Store Response with Key]
    I --> J[Return Response]
```

### FX Rate Fetching Flow

```mermaid
graph TD
    A[Request FX Rate] --> B{In Cache?}
    B -->|Yes| C[Return Cached Rate]
    B -->|No| D{In Database?}
    D -->|Yes| E{Less than 1hr old?}
    E -->|Yes| F[Return DB Rate]
    E -->|No| G[Fetch from API]
    D -->|No| G
    G --> H{API Successful?}
    H -->|Yes| I[Store in Cache]
    H -->|No| J[Use Fallback Rate]
    I --> K[Store in Database]
    J --> L[Return Rate]
    K --> M[Return Rate]
```

---

## 🧪 Testing Strategy

### Running Tests

```bash
# Unit tests
npm run test

# Watch mode
npm run test:watch

# Test coverage
npm run test:cov

# E2E tests
npm run test:e2e
```

### Test Coverage Goals

| Module | Coverage Target | Current |
|--------|----------------|---------|
| Auth Service | 90% | 85% |
| Wallets Service | 90% | 87% |
| Transactions Service | 85% | 82% |
| FX Service | 80% | 75% |
| Controllers | 70% | 65% |

### Critical Path Tests

| Scenario | Test File |
|----------|-----------|
| User Registration | `auth.service.spec.ts` |
| Email Verification | `auth.service.spec.ts` |
| Wallet Funding | `wallets.service.spec.ts` |
| Currency Conversion | `wallets.service.spec.ts` |
| P2P Transfer | `wallets.service.spec.ts` |
| NGN Trading | `trading.service.spec.ts` |
| Transaction History | `transactions.service.spec.ts` |
| Idempotency | `idempotency.repository.spec.ts` |

### Example Test

```typescript
describe('fundWallet', () => {
  it('should successfully fund wallet', async () => {
    const fundAmount = 500;
    
    mockIdempotencyRepository.findValidKey.mockResolvedValue(null);
    mockWalletsRepository.findByUserAndCurrency.mockResolvedValue(mockWallet);
    
    const result = await service.fundWallet('user-id', 'NGN', fundAmount);
    
    expect(result.message).toBe('Wallet funded successfully');
    expect(result.data.amount).toBe(fundAmount);
  });
});
```

---

## 🔒 Security Considerations

### Implemented Security Measures

| Threat | Mitigation |
|--------|------------|
| **Brute Force Attacks** | Rate limiting (5 attempts/minute) |
| **Duplicate Transactions** | Idempotency keys (24hr expiry) |
| **Race Conditions** | Pessimistic locking with SELECT FOR UPDATE |
| **SQL Injection** | TypeORM parameterized queries |
| **XSS Attacks** | Helmet.js CSP headers |
| **JWT Theft** | Short expiry (15m) + refresh rotation |
| **Password Cracking** | bcrypt with 12 rounds |
| **Man-in-the-Middle** | HTTPS required in production |
| **Enumeration Attacks** | Generic error messages |

### Security Headers (Helmet.js)

```typescript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));
```

### Database Encryption

- Passwords: bcrypt hashed
- Sensitive data: Application-level encryption
- SSL: Required for production database connections

---

## 🤔 Key Assumptions

### Business Assumptions

1. **Base Currency**: USD is used as the base currency for FX rates
2. **Minimum Trade Amount**: 100 NGN or 10 foreign currency units
3. **Decimal Precision**: 2 decimal places for all currencies (NGN, USD, EUR, GBP)
4. **Wallet Creation**: Users have wallets created on registration with $0 balance
5. **Auto-creation**: Recipient wallets are auto-created on first transfer
6. **OTP Expiry**: 10 minutes (configurable)
7. **Refresh Token Validity**: 7 days (configurable)

### Technical Assumptions

1. **Rate Limiting**: 3-30 requests per minute per IP
2. **Idempotency Keys**: Valid for 24 hours
3. **Database Connections**: Connection pool size of 10
4. **FX Rate Staleness**: Database rates considered stale after 1 hour
5. **Cache TTL**: 5 minutes for FX rates
6. **Email Delivery**: SMTP server is reliable (retry on failure)
7. **API Availability**: FX rate provider has 99.9% uptime

### User Behavior Assumptions

1. Users verify email within 10 minutes
2. Users don't share their JWT tokens
3. Users use strong passwords (enforced by validation)
4. Users provide valid email addresses
5. Users don't attempt more than 5 login attempts per minute

---

## 🔧 Troubleshooting

### Common Issues and Solutions

| Issue | Possible Cause | Solution |
|-------|---------------|----------|
| **Database Connection Failed** | PostgreSQL not running | `brew services start postgresql` |
| **JWT Secret Missing** | .env not configured | Copy `.env.example` to `.env` |
| **Email Not Sending** | Wrong SMTP credentials | Use Gmail App Password, not regular password |
| **FX Rate = 1** | API key invalid or rate limited | Check `.env` or use fallback rates |
| **404 on /transactions** | Module not imported | Add `TransactionsModule` to `app.module.ts` |
| **409 Conflict on Register** | Email already exists | Use different email |
| **429 Too Many Requests** | Rate limit hit | Wait 1 minute or increase limits |
| **Insufficient Balance** | Not enough funds | Fund wallet first |
| **Token Expired** | 15 minutes passed | Use refresh token |
| **Invalid OTP** | Wrong or expired OTP | Request new OTP |

### Debug Mode

Enable detailed logging:

```bash
# In .env
NODE_ENV=development
DEBUG=true

# Or run with debug flag
npm run start:debug
```

### Health Check Endpoint

```bash
curl http://localhost:3000/api/v1/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2024-03-17T12:00:00.000Z",
  "services": {
    "database": "connected",
    "cache": "ready",
    "email": "configured"
  }
}
```

### Getting Help

If you encounter issues:

1. Check the logs: `tail -f logs/error.log`
2. Run tests: `npm test`
3. Verify environment: `npm run env:check`
4. Check database: `npm run db:check`

---

## 📝 Postman Collection

Import the following collection into Postman:

**`vault-fx-api.postman_collection.json`**
```json
{
  "info": {
    "name": "Vault FX API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Auth",
      "item": [
        {
          "name": "Register",
          "request": {
            "method": "POST",
            "url": "{{baseUrl}}/auth/register",
            "header": [
              { "key": "Content-Type", "value": "application/json" }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"email\": \"user@example.com\",\n  \"password\": \"Test@123456\"\n}"
            }
          }
        },
        {
          "name": "Verify Email",
          "request": {
            "method": "POST",
            "url": "{{baseUrl}}/auth/verify",
            "header": [
              { "key": "Content-Type", "value": "application/json" }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"email\": \"user@example.com\",\n  \"otp\": \"123456\"\n}"
            }
          }
        },
        {
          "name": "Login",
          "request": {
            "method": "POST",
            "url": "{{baseUrl}}/auth/login",
            "header": [
              { "key": "Content-Type", "value": "application/json" }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"email\": \"user@example.com\",\n  \"password\": \"Test@123456\"\n}"
            }
          }
        }
      ]
    },
    {
      "name": "Wallet",
      "item": [
        {
          "name": "Get Wallets",
          "request": {
            "method": "GET",
            "url": "{{baseUrl}}/wallet",
            "header": [
              { "key": "Authorization", "value": "Bearer {{accessToken}}" }
            ]
          }
        },
        {
          "name": "Fund Wallet",
          "request": {
            "method": "POST",
            "url": "{{baseUrl}}/wallet/fund",
            "header": [
              { "key": "Authorization", "value": "Bearer {{accessToken}}" },
              { "key": "Idempotency-Key", "value": "{{$guid}}" },
              { "key": "Content-Type", "value": "application/json" }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"currency\": \"NGN\",\n  \"amount\": 10000\n}"
            }
          }
        }
      ]
    }
  ],
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:3000/api/v1"
    },
    {
      "key": "accessToken",
      "value": ""
    }
  ]
}
```

---

## 📄 License

Copyright © 2024 Vault FX. All rights reserved.

---

## 🙏 Acknowledgments

- NestJS team for the amazing framework
- TypeORM team for the powerful ORM
- PostgreSQL community for the reliable database
- All contributors and testers

---

**Built with ❤️ for the Fintech Ecosystem**
