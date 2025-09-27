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
    Create a `.env` file in the root of the project and add your environment variables:
    ```env
    # Database
    DATABASE_URL=postgresql://username:password@localhost:5432/projxchange
    
    # Upstash Redis Configuration (required for rate limiting)
    UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
    UPSTASH_REDIS_REST_TOKEN=your-redis-token
    
    # JWT Secret
    JWT_SECRET=your-super-secret-jwt-key-here
    
    # Cloudinary Configuration
    CLOUDINARY_CLOUD_NAME=your-cloud-name
    CLOUDINARY_API_KEY=your-api-key
    CLOUDINARY_API_SECRET=your-api-secret
    
    # Email Configuration
    EMAIL_HOST=smtp.gmail.com
    EMAIL_PORT=587
    EMAIL_USER=your-email@gmail.com
    EMAIL_PASS=your-app-password
    
    # Server Configuration
    PORT=3000
    NODE_ENV=development
    ```

4.  **Set up Upstash Redis:**
    - Create a free account at [Upstash](https://upstash.com/)
    - Create a new Redis database
    - Copy the REST URL and token from your database dashboard
    - Add them to your `.env` file as `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
    
    The application uses Upstash Redis for rate limiting functionality, which is perfect for serverless deployments.

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

## Rate Limiting

This API includes comprehensive rate limiting using Upstash Redis and the token bucket algorithm. Different endpoint types have different rate limits:

- **General API**: 100 requests/minute with burst capacity of 200
- **Authentication**: 5 requests/minute with burst capacity of 10 (login, signup, password reset)
- **File Upload**: 10 requests/minute with burst capacity of 20 (project creation, file uploads)
- **Admin**: 50 requests/minute with burst capacity of 100 (admin operations)
- **Public**: 200 requests/minute with burst capacity of 400 (browsing, public endpoints)

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Time when the rate limit resets
- `Retry-After`: Seconds to wait before retrying (when rate limited)

When rate limited, the API returns a 429 status code with error details.
