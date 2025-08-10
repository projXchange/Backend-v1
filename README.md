# Backend-V1  

This is a backend project built with [Hono](https://hono.dev/) and [Drizzle ORM](https://orm.drizzle.team/).

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later recommended)
- [pnpm](https://pnpm.io/)

## Getting Started

1.  **Clone the repository**

2.  **Install dependencies:**
    ```bash
    pnpm install
    ```

3.  **Set up environment variables:**
    Create a `.env` file in the root of the project and add your environment variables (e.g., `DATABASE_URL`).

## Available Scripts

### Development

**`pnpm run dev`**

Runs the application in development mode using `ts-node` and `nodemon`. The server will automatically restart when you make changes to files in the `src` directory.

### Production

**`pnpm run build`**

Compiles the TypeScript source code from `src/` into JavaScript in the `dist/` directory. This is necessary before running the application in production.

**`pnpm run start`**

Starts the application from the compiled JavaScript files in the `dist/` directory. This command should be used in production after running `pnpm run build`.

### Database Migrations

**`pnpm run db:generate`**

Generates a new SQL migration file based on changes to your Drizzle ORM schema. Run this command after you modify your schema definitions.

**`pnpm run db:migrate`**

Applies all pending migrations to the database. This command executes the `src/db/migrate.ts` script to update your database schema to the latest version.
