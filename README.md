# Vault FX API

A secure, scalable foreign exchange trading API built with NestJS, TypeORM, and PostgreSQL.

## Features

- ✅ User registration with email verification (OTP)
- ✅ JWT authentication with refresh tokens
- ✅ Multi-currency wallet management (NGN, USD, EUR, GBP)
- ✅ Real-time FX rates with caching
- ✅ Currency conversion and trading
- ✅ Idempotent transactions (prevents duplicates)
- ✅ Transaction history
- ✅ Rate limiting and security headers

## Tech Stack

- **Framework**: NestJS
- **Database**: PostgreSQL
- **ORM**: TypeORM
- **Auth**: JWT, Passport
- **Email**: Nodemailer (Gmail SMTP)
- **Documentation**: Swagger

## Prerequisites

- Node.js (v16+)
- PostgreSQL (v13+)
- Redis (optional, for production)

## Setup Instructions

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/vault-fx-api.git
   cd vault-fx-api