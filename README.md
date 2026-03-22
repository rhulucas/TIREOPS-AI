# TireOps AI

Tire industry full-stack smart platform with **enterprise-grade** 7 modules.

## Enterprise Features

| Feature | Description |
|---------|-------------|
| **PostgreSQL** | One database engine across local, staging, and production |
| **Auth** | NextAuth.js login, JWT session |
| **Roles** | ADMIN / USER (extensible) |
| **API rate limit** | 60 req/min/IP |
| **Azure ready** | Deployment docs, global access |

## Modules

| Module | Function |
|--------|----------|
| **Dashboard** | Production lines, QC, tread efficiency |
| **AI Quoting** | Tire quote, EU label, DOT/ECE |
| **Orders** | Order status: PRODUCTION / QC CHECK |
| **Email AI** | OEM / fleet / warranty scenarios |
| **Invoice AI** | Invoice, warranty, cert fee |
| **Tread Designer** | Tread design → AI analysis → CNC export |
| **Compound Spec** | phr formula, EU prediction |

## Stack

- **Frontend**: Next.js 16 + React 19 + TypeScript + Tailwind CSS
- **Backend**: Next.js API Routes + Prisma ORM
- **Database**: PostgreSQL in every environment, Docker locally, Azure for shared/production
- **Auth**: NextAuth.js v5 + bcrypt
- **AI**: OpenAI GPT-4o-mini

## Requirements

- **Node.js** >= 20.9.0
- **PostgreSQL** 16+ (Docker for local)

## Environment Model

This repo is set up for a standard enterprise workflow:

- Local development: Docker PostgreSQL on your machine
- Staging / demo: separate Azure PostgreSQL database
- Production: separate Azure PostgreSQL database

Use the same Prisma schema in all environments, and move changes with migrations. Do not use your production database as your default development database.

More detail: [docs/DATABASE_ENVIRONMENTS.md](docs/DATABASE_ENVIRONMENTS.md)

## Quick Start

### 1. Local PostgreSQL (Docker)

```bash
docker-compose up -d
```

### 2. Environment

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Configure:
- `DATABASE_URL`: `postgresql://tireops:tireops_dev@localhost:5432/tireops`
- `AUTH_SECRET`: run `openssl rand -base64 32`
- `OPENAI_API_KEY`: optional

For Azure or other shared environments, use `.env.azure.example` as the template and store the real values in your deployment platform's secret settings.

### 3. Database

```bash
npm run db:migrate:dev -- --name init
npm run db:seed
```

For a larger local demo dataset:

```bash
npm run db:seed:large
```

This resets business tables and regenerates a much larger set of customers, orders, quotes, invoices, email drafts, compound specs, tread designs, and production lines.

### 4. Run

```bash
npm run dev
```

Visit http://localhost:3000

**Default login**: `admin@tireops.com` / `admin123` (change in production)

## Deployment Flow

1. Develop locally against Docker PostgreSQL.
2. Commit Prisma schema and generated migrations.
3. Deploy to staging and run `npm run db:migrate:deploy`.
4. Promote to production and run the same deploy migration step there.

This keeps schema changes consistent without moving your local database into Azure.

## Free Demo Deployment (Recommended)

Zero DB cost: Neon free PostgreSQL + Azure Web App.

**Steps**: [docs/FREE_DEMO_SETUP.md](docs/FREE_DEMO_SETUP.md)

## Full Azure Deployment (with paid DB)

See [docs/AZURE_DEPLOYMENT.md](docs/AZURE_DEPLOYMENT.md)

Brief steps:
1. Create Azure Database for PostgreSQL
2. Create Web App (Node 20)
3. Configure env vars
4. Deploy via GitHub
5. Run `prisma migrate deploy` and `db:seed`
