# RRIV-API

The main RRIV API, the heart of our platform.

# Installation

```bash
deno install --entrypoint src/server.ts
```

# Post-Installation Instructions

## Run the Post-Install Script

```bash
deno task postinstall
```

## Database Migrations

```bash
deno task prisma migrate dev
```

## Note

If a new migration is created, you need to regenerate the Prisma Client via the command below

```bash
deno task prisma generate
```
