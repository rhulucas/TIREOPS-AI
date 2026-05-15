# TireOps — AI-Powered Tire Manufacturing Operations Platform

<div align="center">

**A full-stack enterprise operations platform built for tire manufacturers —**
**combining production management, AI-assisted sales, customer communications, and billing in one unified system.**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Available-brightgreen?style=for-the-badge&logo=microsoft-azure)](https://tireops-demo1-cce6djgwf3aeevd4.canadacentral-01.azurewebsites.net)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Azure-336791?style=for-the-badge&logo=postgresql)](https://azure.microsoft.com/products/postgresql)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o--mini-412991?style=for-the-badge&logo=openai)](https://openai.com)

</div>

---

## Live Demo

> Try the full platform without any setup — no registration required.

**URL:** [https://tireops-demo1-cce6djgwf3aeevd4.canadacentral-01.azurewebsites.net](https://tireops-demo1-cce6djgwf3aeevd4.canadacentral-01.azurewebsites.net)

```
Email:    admin@tireops.com
Password: admin123
```

> All data in the demo is simulated and stored in Azure PostgreSQL. Feel free to create orders, send quotes, generate invoices, and explore every module.

---

## What Is TireOps?

Tire manufacturers manage a complex chain of operations: quoting prices to fleet customers, tracking production across multiple lines, coordinating delivery logistics, and billing hundreds of clients — often across different tools with no unified view.

**TireOps** brings all of that into a single AI-powered platform:

- Sales teams get **AI-generated quotes** with win probability scoring and negotiation guidance
- Production managers track every order through the **full manufacturing lifecycle**
- Finance generates and sends **AI-assisted invoices** in seconds
- Customer communications are handled through a built-in **Email AI + Inbox** with simulated multi-round negotiation
- Engineers manage **tread designs and rubber formulations** with change request workflows
- Teams can inspect historical records through a role-based **Data Center** for Sales, Finance, Engineering, and Admin views

Everything is connected — a quote converts to an order, an order triggers an invoice, and every step has a corresponding email thread.

---

## End-to-End Business Workflow

```
  Customer Inquiry
        │
        ▼
  ┌─────────────┐
  │   Quoting   │  AI generates price, win probability, risk flags, negotiation tips
  └──────┬──────┘
         │ Send Quote Email
         ▼
  ┌──────────────────────┐
  │  Email AI + Inbox    │  Multi-round negotiation → customer agrees
  └──────────┬───────────┘
             │ Convert to Order
             ▼
  ┌─────────────────────────────────────────────────────┐
  │  Orders   PENDING → IN_PRODUCTION → QC → SHIPPED → DELIVERED  │
  └──────────────────────────┬──────────────────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │   Invoice AI    │  Smart draft → Save → Send Invoice Email
                    └────────┬────────┘
                             │
                             ▼
                    ┌──────────────────────┐
                    │  Email AI + Inbox    │  Customer confirms payment
                    └────────┬─────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │    Mark Paid ✓  │
                    └─────────────────┘
```

---

## Platform Modules

### Dashboard
The operational command center. At a glance: units quoted, open orders, production efficiency, QC failure count, recent activity feed, and live production line status across the factory floor.

---

### AI Sales Quoting
Input a customer, tire specification, quantity, and delivery window — the AI returns:
- Recommended unit price based on volume and market positioning
- **Win probability score** (0–100%) based on customer history
- Risk flags: overdue payments, aggressive timelines, high-volume first orders
- Payment term suggestions and negotiation angles

One click sends the quote as an email thread to the customer.

---

### Order Management
Full production lifecycle tracking from receipt to delivery:

| Status | Stage |
|---|---|
| `PENDING` | Received, awaiting production start |
| `IN_PRODUCTION` | On the manufacturing floor |
| `QC` | Quality control inspection |
| `READY` | Cleared QC, awaiting dispatch |
| `SHIPPED` | In transit |
| `DELIVERED` | Confirmed received |

Update status inline, navigate directly to the linked invoice or email thread.

---

### Invoice AI
After delivery, generate a professional invoice in seconds:
- Links to the original order and auto-populates line items (spec, qty, inferred unit price)
- Auto-adds freight charges for large orders (qty ≥ 300 units)
- Infers payment terms based on order value
- Runs **6 automated risk checks**: missing address, unmatched order ref, pricing discrepancy, tax rate, etc.
- GPT generates commercial review notes and billing recommendations
- **✉ Send Invoice** button creates an email thread and opens the conversation instantly

Invoice history with year filtering, search, total amount column, and one-click **Mark Paid**.

---

### Email AI + Inbox
A unified communication hub replacing scattered email clients:

**Thread management:**
- Search, filter by status (Open / Agreed / Closed), filter by year, sort by date
- 100 pre-seeded threads across 2021–2026 for a realistic demo experience

**Conversation view:**
- Chat-style layout — Sales on the right, Customer on the left
- Simulated customer auto-replies based on conversation round

**AI Draft panel:**
- Pick a scenario (Quote Follow-up, Invoice Delivery, Delay Notice, Reorder Reminder)
- Pick a tone (Formal, Friendly, Concise)
- Add extra context — GPT writes the full reply
- One click to use or append the draft

**Quote thread actions:** Mark Agreed → Convert to Order

**Invoice thread flow:** Customer replies simulate receipt acknowledgement → payment initiated → confirmation

---

### Customer Management
Full CRM with AI-powered account intelligence:
- Customer directory with linked orders, quotes, and invoices
- AI generates: spend analysis, predicted reorder date, relationship health score, upsell opportunities

---

### Data Center
A role-based operational data table for reviewing the simulated PostgreSQL records behind the demo.

**Role views:**
- **Sales**: Customers, Quotes, Orders, Email Threads
- **Finance**: Invoices, Orders, Customers
- **Engineering**: Tread Designs, Compounds, Change Requests, Production Lines
- **Admin**: Full demo data access for system review and CSV export

The Data Center is protected by login and is designed to show how different departments can use the same operational database without every role needing the same view.

---

### Tread Designer
Professional tread pattern design tool for engineers:
- Define dimensions, application type, EU label ratings (wet grip, rolling resistance, noise)
- Version history and revision tracking
- **Change Request workflow**: engineers submit modifications, AI assesses feasibility and production impact, reviewers approve or reject

---

### Compound Spec
Rubber formulation management:
- Define polymer type, filler system, shore hardness, tensile strength, curing specifications
- AI predicts EU label compliance and suggests formulation adjustments

---

## AI Feature Matrix

| Module | AI Capability | Without API Key |
|---|---|---|
| Quoting | Price recommendation, win probability, risk flags, negotiation tips | Rule-based estimate |
| Invoice AI | Line item inference, payment terms, risk checks, GPT review notes | Rule-based checks only |
| Email AI | Full reply drafting for any scenario and tone | Not available |
| Customer Intelligence | Spend trends, reorder prediction, opportunity scoring | Static history view |
| Tread Designer | Design recommendations, EU rating prediction | Manual entry only |
| Compound Spec | Formulation suggestions, label compliance prediction | Manual entry only |

> All AI features gracefully degrade — the platform is fully operational without an OpenAI API key.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) + React 19 |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 |
| Database | Azure Database for PostgreSQL + Prisma ORM |
| Authentication | NextAuth.js v5, bcrypt, JWT sessions |
| AI | OpenAI GPT-4o-mini |
| Deployment | Azure App Service / Web App (Canada Central) |

---

## Running Locally

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment variables
Create a `.env` file:
```env
DATABASE_URL=        # PostgreSQL connection string
AUTH_SECRET=         # Random secret, 32+ characters
OPENAI_API_KEY=      # Optional
```

### 3. Set up the database
```bash
npx prisma migrate deploy
npx prisma generate
```

### 4. Seed demo data (optional)
```bash
npm run db:seed
npm run db:seed:emails
```

`npm run db:seed` creates users, customers, orders, quotes, invoices, tread designs, compounds, change requests, and production lines. `npm run db:seed:emails` adds 100 simulated customer email conversations across 2021-2026 for the Email AI + Inbox module.

### 5. Start the dev server
```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

---

## Azure Deployment

The live demo is deployed to Azure App Service and connected to Azure Database for PostgreSQL.

Required production app settings:

| Setting | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string with SSL enabled |
| `AUTH_SECRET` | NextAuth session secret |
| `OPENAI_API_KEY` | Optional key for AI generation |
| `NODE_ENV` | `production` |

Deployment is handled through GitHub Actions using an Azure publish profile stored as a GitHub repository secret. The Azure App Service startup command is:

```bash
node server.js
```

The application uses Next.js standalone output for Azure deployment.

---

## Project Structure

```
src/
├── app/
│   ├── api/                 # All API routes (auth, orders, quotes, invoices, email, AI)
│   ├── dashboard/           # Dashboard page
│   ├── quoting/             # Sales Quoting page
│   ├── orders/              # Order Management page
│   ├── invoice/             # Invoice AI page
│   ├── email/               # Email AI + Inbox page
│   ├── customers/           # Customer Management page
│   ├── data-center/         # Role-based operational data tables
│   ├── tread-designer/      # Tread Designer page
│   └── compound-spec/       # Compound Spec page
├── components/              # AppShell, Sidebar, CustomerAutocomplete
└── lib/                     # db, auth, api-utils, openai-config, safe-json
prisma/
├── schema.prisma            # Full database schema
├── migrations/              # SQL migration history
├── seed.ts                  # Main demo data seeder
└── seed-email-threads.ts    # Email conversation demo seeder
```

---

## Database Models

`User` · `Customer` · `Order` · `Quote` · `Invoice` · `EmailThread` · `EmailMessage` · `TreadDesign` · `ChangeRequest` · `CompoundSpec` · `ProductionLine`

---

<div align="center">

Built with Next.js · Hosted on Azure · Powered by OpenAI

</div>
