# TireOps Azure Deployment Guide

## Architecture

| Component | Azure Service | Description |
|-----------|---------------|-------------|
| Web App | Azure App Service (Linux, Node 20) | Hosts Next.js |
| Database | Azure Database for PostgreSQL (Flexible) | Persistent storage |
| AI | OpenAI API or Azure OpenAI Service | AI features |
| Auth | NextAuth.js (JWT) | Login, permissions |

## Prerequisites

1. **Azure account**: https://azure.microsoft.com/free
2. **GitHub repo**: Code pushed
3. **Env vars**: `AUTH_SECRET`, `OPENAI_API_KEY`

Generate AUTH_SECRET:
```bash
openssl rand -base64 32
```

## Create Azure Database for PostgreSQL

1. Login to [Azure Portal](https://portal.azure.com)
2. **Create resource** → search **Azure Database for PostgreSQL**
3. Choose **Flexible server**
4. Configure:
   - Subscription, resource group (e.g. `tireops-rg`)
   - Server name: `tireops-db`
   - Region: same as Web App (e.g. East Asia)
   - PostgreSQL version: 16
   - Compute + storage: B1ms (dev) / higher (prod)
   - Admin username, password
5. **Networking**: Allow Azure services
6. After create, get connection string (ADO.NET format), convert to:
   ```
   postgresql://username:password@servername.postgres.database.azure.com:5432/postgres?sslmode=require
   ```

## Create Web App and Deploy

1. **Create Web App**:
   - Resource: Web App
   - Runtime: Node 20 LTS
   - OS: Linux
   - Region: East Asia

2. **Configure env** (Configuration → Application settings):

| Name | Value |
|------|-------|
| DATABASE_URL | Connection string from above |
| AUTH_SECRET | openssl output |
| OPENAI_API_KEY | sk-xxx |
| NODE_ENV | production |

3. **Deployment Center**:
   - Source: GitHub
   - Select repo, branch (main)
   - Save to trigger deploy

## After First Deploy

1. Run migration (local or Cloud Shell with DATABASE_URL):
   ```bash
   npx prisma migrate deploy
   npm run db:seed
   ```

2. Default admin: `admin@tireops.com` / `admin123` (change immediately in production)

## Production Tips

- **SSL/TLS**: Azure App Service provides HTTPS
- **Scale**: Adjust App Service instances
- **Backup**: Azure Database for PostgreSQL supports auto backup
- **Monitor**: Enable Application Insights
- **Secrets**: Consider Azure Key Vault (optional)
