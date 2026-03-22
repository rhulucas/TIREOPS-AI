# Migrate Database to Azure PostgreSQL

This guide walks you through migrating TireOps from Neon to **Azure Database for PostgreSQL**.

---

## 1. Create a PostgreSQL Database on Azure

### Step 1: Sign in to Azure Portal

Open [https://portal.azure.com](https://portal.azure.com) and sign in with your Azure account.

### Step 2: Create a PostgreSQL Flexible Server

1. Click **Create a resource**
2. Search for **Azure Database for PostgreSQL**
3. Select **Flexible server**
4. Click **Create**

### Step 3: Basic configuration

| Field | Recommended value |
|-------|-------------------|
| Subscription | Your subscription |
| Resource group | Create new or use `tireops-rg` |
| Server name | `tireops-db` (must be globally unique) |
| Region | East Asia or same region as your app |
| PostgreSQL version | 16 |
| Compute + storage | B1ms (dev) / D2s_v3 (production) |
| Admin username | `tireopsadmin` |
| Password | Set a strong password and save it |

### Step 4: Networking

- Go to the **Networking** tab
- Under **Connectivity method**: select **Public access**
- Check **Allow public access from Azure services and resources within Azure**
- Optionally add your current client IP for local development access

### Step 5: After creation

Note the server hostname (e.g. `tireops-db.postgres.database.azure.com`).

---

## 2. Get the Connection String

### In Azure Portal

1. Open your PostgreSQL server
2. Go to **Connection strings** or **Server parameters** in the left menu
3. Copy the **hostname**: `tireops-db.postgres.database.azure.com`

### Build the DATABASE_URL

Format:

```
postgresql://username:password@hostname:5432/tireops?sslmode=require
```

Example:

```
postgresql://tireopsadmin:yourpassword@tireops-db.postgres.database.azure.com:5432/tireops?sslmode=require
```

If your password contains special characters (`@`, `#`, `%`), [URL-encode](https://www.w3schools.com/tags/ref_urlencode.asp) them first.

---

## 3. Update Local .env

1. Open `.env` in the project root
2. Replace `DATABASE_URL` with the Azure connection string:

```env
DATABASE_URL="postgresql://tireopsadmin:yourpassword@tireops-db.postgres.database.azure.com:5432/tireops?sslmode=require"
AUTH_SECRET="dev-secret-at-least-32-characters-long"
OPENAI_API_KEY="sk-proj-xxx"
```

3. Save the file

---

## 4. Run Migrations and Seed

In the project directory:

```bash
cd "/Users/ronghu/Documents/cursor project/tireops"
nvm use
npx prisma migrate deploy
npm run db:seed
```

- `prisma migrate deploy` — creates all tables on Azure
- `npm run db:seed` — inserts admin account and sample data

---

## 5. Verify

1. Start the dev server:

```bash
npm run dev
```

2. Open http://127.0.0.1:3000
3. Log in with `admin@tireops.com` / `admin123`
4. Check that Orders, Customers, and other pages display data correctly

---

## 6. Data Migration from Neon (Optional)

If you want to migrate existing data from Neon to Azure:

### Method A: pg_dump and psql

```bash
# 1. Export from Neon
pg_dump "your-neon-connection-string" --no-owner --no-acl > neon_backup.sql

# 2. Import to Azure
psql "your-azure-connection-string" < neon_backup.sql
```

### Method B: Re-seed (common for dev environments)

Skip data migration and run `npm run db:seed` on Azure to generate fresh sample data.

---

## Troubleshooting

### Connection timeout

- Check Azure firewall: ensure your IP or "Allow Azure services" is enabled
- Confirm `sslmode=require` is in the connection string

### Authentication failed

- Verify username and password are correct
- Username format: `username` (not `username@servername` for Flexible Server)

### Prisma connection error

- Confirm `DATABASE_URL` has no extra spaces or newlines
- URL-encode any special characters in the password

---

## Summary

1. Create an Azure PostgreSQL Flexible Server
2. Build and configure `DATABASE_URL`
3. Update `.env`
4. Run `prisma migrate deploy` and `npm run db:seed`
5. Start the app and verify

Once done, TireOps will use Azure PostgreSQL as its database.
