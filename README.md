# RRIV-API

The main RRIV API, the heart of our platform.

# Installation

```bash
deno install --entrypoint src/server.ts --allow-scripts
```

# Post-Installation Instructions

## Database Migrations

```bash
deno task prisma migrate deploy
```

## Run the Post-Install Script

```bash
deno task postinstall
```

## Note

If a new migration is created, you need to regenerate the Prisma Client

```bash
deno task prisma generate
```

## start

```bash
deno task dev
```

# Database Setup

In production environments, the database should be set up with a dedicated
schema and user for the rriv api. The following commands create a schema and
grant access for the user. For added security, separate users should be created
for applying migrations and querying the data from microservice code.

```
create schema rriv;
grant usage on schema rriv to "rriv-api";
grant create on schema rriv to "rriv-api";
```
