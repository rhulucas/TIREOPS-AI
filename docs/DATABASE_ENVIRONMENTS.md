# Database Environments

This project should use PostgreSQL in all environments, but each environment should have its own database.

## Recommended setup

| Environment | Database | Purpose |
| --- | --- | --- |
| Local development | Docker PostgreSQL | Build features, run migrations, test SQL locally |
| Staging / demo | Azure Database for PostgreSQL | Shared validation, demos, QA |
| Production | Azure Database for PostgreSQL | Real customer and operations data |

## Core rule

Use the same schema across environments, not the same database instance.

- Local development should default to a local Docker database.
- Staging should use a separate Azure database.
- Production should use a different Azure database again.
- Schema changes move through Prisma migrations.

## Local development workflow

1. Start PostgreSQL locally:

```bash
docker-compose up -d
```

2. Create your local env file from the local template:

```bash
cp .env.example .env
```

3. Apply migrations and seed local data:

```bash
npm run db:migrate:dev
npm run db:seed
```

4. Start the app:

```bash
nvm use
npm run dev
```

## Staging and production workflow

Do not copy your local `.env` to Azure.

- Configure `DATABASE_URL`, `AUTH_SECRET`, and other secrets in Azure App Settings.
- Run `npm run db:migrate:deploy` against the target Azure database during deployment.
- Only seed non-production environments unless you explicitly need production bootstrap data.

## Working with SQL

PostgreSQL is still your database everywhere. Docker is only how you run it locally.

- Write and test SQL against local Docker PostgreSQL first.
- Validate important read queries in staging if they depend on realistic volume.
- Run production SQL carefully, ideally read-only unless the change is planned and reviewed.
- Add indexes through Prisma migrations or reviewed SQL migrations, not ad hoc edits in production.

## Handling larger datasets

Tens of thousands of rows are not a problem for PostgreSQL. What matters is operational discipline.

- Add indexes for frequent filters and joins.
- Use pagination for list endpoints.
- Avoid loading large tables fully into memory.
- Keep backups and monitoring on Azure environments.
- Do not store the only copy of important data on a developer machine.

## Environment examples

- Local template: [`.env.example`](/Users/ronghu/Documents/cursor%20project/tireops/.env.example)
- Azure template: [`.env.azure.example`](/Users/ronghu/Documents/cursor%20project/tireops/.env.azure.example)
