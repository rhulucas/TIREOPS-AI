# TireOps - AWS Deployment Guide

Get TireOps running with full AI features on AWS.

---

## Required Environment Variables

| Variable | Description | How to get |
|----------|-------------|------------|
| `DATABASE_URL` | PostgreSQL connection string | Keep Neon, or use AWS RDS |
| `AUTH_SECRET` | NextAuth secret key | `openssl rand -base64 32` |
| `OPENAI_API_KEY` | OpenAI API key | https://platform.openai.com/api-keys |
| `NODE_ENV` | Runtime environment | `production` |

### Get your OPENAI_API_KEY

1. Go to https://platform.openai.com
2. Sign in and navigate to **API keys**
3. Click **Create new secret key**
4. Copy the generated key (starts with `sk-`)
5. Add it as the `OPENAI_API_KEY` environment variable in your deployment platform

> Without it, AI modules return mock results. With it, real GPT calls are made.

---

## Option A: AWS Amplify (Recommended for beginners)

> **Note**: Next.js 16 may have compatibility issues with Amplify. If deployment fails, try Option B (Docker) instead.

### 1. Prerequisites

- Code pushed to GitHub / GitLab / Bitbucket
- AWS account

### 2. Create the app

1. Sign in to [AWS Console](https://console.aws.amazon.com/)
2. Search for **Amplify** → **AWS Amplify**
3. Click **New app** → **Host web app**
4. Select **GitHub** (or your Git provider)
5. Authorize and select the `tireops-ai` repository
6. Choose branch `main`

### 3. Build settings

Amplify auto-detects Next.js and uses default settings.

To customize, use the `amplify.yml` already included in the project root.

### 4. Configure environment variables

In the Amplify console:

1. Go to **App settings** → **Environment variables**
2. Add:

```
DATABASE_URL    = postgresql://... (Neon or RDS connection string)
AUTH_SECRET     = (output of: openssl rand -base64 32)
NEXTAUTH_URL    = https://your-amplify-url.amplifyapp.com
OPENAI_API_KEY  = sk-...
NODE_ENV        = production
```

### 5. Deploy

Save and Amplify will automatically build and deploy. Access the generated URL when complete.

### 6. Database migration

After first deploy, run migrations and seed data from your local machine:

```bash
npx prisma migrate deploy
npm run db:seed
```

---

## Option B: EC2 + Docker (More control)

### 1. Launch EC2

1. Choose **Amazon Linux 2023** or **Ubuntu**
2. Instance type: t3.small or larger
3. Security group: open ports 22 (SSH), 80, 443

### 2. Install Docker

```bash
sudo yum update -y
sudo yum install docker -y
sudo systemctl start docker
sudo usermod -aG docker ec2-user
```

### 3. Build and run

```bash
# Build from source or pull from registry
docker build -t tireops .
docker run -d -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e AUTH_SECRET="..." \
  -e OPENAI_API_KEY="sk-..." \
  tireops
```

### 4. Nginx reverse proxy (optional)

To use ports 80/443 with a custom domain, configure Nginx as a reverse proxy to port 3000 on EC2.

---

## Option C: AWS App Runner (Containerized hosting)

1. Go to [App Runner](https://console.aws.amazon.com/apprunner/) and create a service
2. Source: ECR image or GitHub
3. Configure environment variables (same as above)
4. Access the generated URL after deploy

---

## Database Options

### Keep Neon (free tier)

- No changes needed — keep your existing `DATABASE_URL`
- Good for development and small-scale production

### Use AWS RDS PostgreSQL

1. Create a PostgreSQL instance in RDS
2. Get the connection string:
   ```
   postgresql://user:password@xxx.region.rds.amazonaws.com:5432/tireops?sslmode=require
   ```
3. Replace `DATABASE_URL` with the above connection string

---

## Verify AI is working

1. Open the deployed site and log in
2. Go to **Sales Quote Assistant**, fill in the form, click **Generate AI Quote**
3. If you get a natural, detailed response — AI is working
4. If you see placeholder content — check your `OPENAI_API_KEY` environment variable

---

## Troubleshooting

**Q: 404 after deploy?**
Check that Amplify is using Next.js rendering mode and routing is correct.

**Q: AI always returns mock results?**
Confirm `OPENAI_API_KEY` is set, correctly formatted, and not expired.

**Q: Login fails?**
Confirm `prisma migrate deploy` and `db:seed` have been run, and `AUTH_SECRET` is correctly set.
