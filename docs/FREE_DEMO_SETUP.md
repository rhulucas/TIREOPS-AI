# TireOps Free Demo Deployment

Use **Neon free PostgreSQL** + **Azure Web App** for zero database cost.

---

## Step 1: Get Free Database (Neon)

1. Go to **[Neon](https://neon.tech)**
2. Click **Sign Up**, login with GitHub (fastest)
3. Click **New Project**
4. Enter:
   - **Project name**: `tireops`
   - **Region**: e.g. `Asia Pacific (Singapore)`
5. Click **Create Project**
6. Copy **Connection string** (URI format):
   ```
   postgresql://username:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require
   ```
7. **Save it** for later

---

## Step 2: Create Azure Web App

1. Login to [Azure Portal](https://portal.azure.com)
2. Open resource group `tireops-rg`, click **+ Create**
3. Search **Web App** → **Web App** → **Create**
4. Configure:
   - **Resource group**: `tireops-rg`
   - **Name**: `tireops-app` (or any unique name)
   - **Publish**: Code
   - **Runtime stack**: Node 20 LTS
   - **Operating System**: Linux
   - **Region**: Central US (match resource group)
5. **Review + create** → **Create**

---

## Step 3: Environment Variables

1. Open **tireops-app** in Azure
2. **Configuration** → **Application settings**
3. **+ New application setting**:

| Name | Value |
|------|-------|
| `DATABASE_URL` | Connection string from Step 1 |
| `AUTH_SECRET` | Output of `openssl rand -base64 32` |
| `NODE_ENV` | `production` |
| `OPENAI_API_KEY` | (optional) your OpenAI key |

4. **Save**

---

## Step 4: Deploy from GitHub

1. Ensure TireOps code is on GitHub
2. Web App → **Deployment Center**
3. **Source**: GitHub
4. Authorize and select org / repo / branch (e.g. `main`)
5. **Save**, wait for deployment

---

## Step 5: Initialize Database

Run locally (set `DATABASE_URL` to Neon connection string):

```bash
cd "/Users/ronghu/Documents/cursor project/tireops"

export DATABASE_URL="your Neon connection string"

npx prisma migrate deploy
npm run db:seed
```

---

## Step 6: Access Demo

Open: **https://your-app-name.azurewebsites.net**

Login: `admin@tireops.com` / `admin123`

---

## Cost

- **Neon**: Free tier for personal demo
- **Azure Web App**: Free tier or credits, depends on subscription
