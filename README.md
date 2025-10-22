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
